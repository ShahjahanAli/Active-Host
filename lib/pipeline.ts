/**
 * Generates a self-contained bash pipeline script that the Active Host agent
 * executes on the remote server to:
 *   1. Pull the latest code from git
 *   2. Install dependencies
 *   3. Build the application
 *   4. (Optionally) run tests
 *   5. Restart the process via PM2 / systemd / Docker
 *   6. Reload Nginx (if enabled and domain is set)
 *
 * The script uses structured sentinel lines so the caller can parse step outcomes:
 *   [STEP:start]  <step-name>
 *   [STEP:ok]     <step-name>
 *   [STEP:fail]   <step-name>
 *   [PIPELINE:success]
 *   [PIPELINE:failed]  <step-name>
 */

export interface PipelineConfig {
  workDir:           string;
  gitRepo:           string;
  gitBranch:         string;
  installCmd:        string;
  buildCmd:          string;
  testCmd:           string;
  skipTests:         boolean;
  processManager:    "pm2" | "systemd" | "docker";
  processName:       string;
  dockerComposeFile: string;
  nginxEnabled:      boolean;
  domain:            string;
  nginxPort:         number;
}

function restartBlock(cfg: PipelineConfig): string {
  switch (cfg.processManager) {
    case "pm2":
      return [
        `echo "[STEP:start] restart-app"`,
        `if pm2 list | grep -q "${cfg.processName}"; then`,
        `  pm2 restart "${cfg.processName}" --update-env`,
        `else`,
        `  pm2 start npm --name "${cfg.processName}" -- start`,
        `fi`,
        `pm2 save`,
        `echo "[STEP:ok] restart-app"`,
      ].join("\n");

    case "systemd":
      return [
        `echo "[STEP:start] restart-app"`,
        `sudo systemctl restart "${cfg.processName}"`,
        `echo "[STEP:ok] restart-app"`,
      ].join("\n");

    case "docker":
      return [
        `echo "[STEP:start] restart-app"`,
        `cd "${cfg.workDir}"`,
        `docker compose -f "${cfg.dockerComposeFile}" pull`,
        `docker compose -f "${cfg.dockerComposeFile}" up -d --force-recreate`,
        `echo "[STEP:ok] restart-app"`,
      ].join("\n");
  }
}

function nginxBlock(cfg: PipelineConfig): string {
  if (!cfg.nginxEnabled || !cfg.domain) return "";
  const vhostName = cfg.domain.replace(/[^a-zA-Z0-9._-]/g, "_");
  const config = [
    `server {`,
    `    listen 80;`,
    `    server_name ${cfg.domain} www.${cfg.domain};`,
    `    location / {`,
    `        proxy_pass http://127.0.0.1:${cfg.nginxPort};`,
    `        proxy_http_version 1.1;`,
    `        proxy_set_header Upgrade $http_upgrade;`,
    `        proxy_set_header Connection 'upgrade';`,
    `        proxy_set_header Host $host;`,
    `        proxy_set_header X-Real-IP $remote_addr;`,
    `        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,
    `        proxy_cache_bypass $http_upgrade;`,
    `    }`,
    `}`,
  ].join("\\n");

  return [
    `echo "[STEP:start] nginx-config"`,
    `echo -e '${config}' | sudo tee /etc/nginx/sites-available/${vhostName} > /dev/null`,
    `sudo ln -sf /etc/nginx/sites-available/${vhostName} /etc/nginx/sites-enabled/${vhostName}`,
    `sudo nginx -t && sudo systemctl reload nginx`,
    `echo "[STEP:ok] nginx-config"`,
  ].join("\n");
}

export function buildPipelineScript(cfg: PipelineConfig): string {
  const steps: string[] = [];

  const step = (name: string, cmd: string) => [
    `echo "[STEP:start] ${name}"`,
    `${cmd}`,
    `if [ $? -ne 0 ]; then echo "[STEP:fail] ${name}"; echo "[PIPELINE:failed] ${name}"; exit 1; fi`,
    `echo "[STEP:ok] ${name}"`,
  ].join("\n");

  // ── 1. Git pull ──────────────────────────────────────────────────
  steps.push(step(
    "git-pull",
    [
      `mkdir -p "${cfg.workDir}"`,
      `cd "${cfg.workDir}"`,
      `if [ -d .git ]; then`,
      `  git fetch origin`,
      `  git reset --hard origin/${cfg.gitBranch}`,
      `else`,
      `  git clone --branch ${cfg.gitBranch} "${cfg.gitRepo}" .`,
      `fi`,
    ].join(" && ") + " || (" +
    [
      `git clone --branch ${cfg.gitBranch} "${cfg.gitRepo}" "${cfg.workDir}"`,
    ].join(" ") + ")"
  ));

  // ── 2. Install ───────────────────────────────────────────────────
  if (cfg.installCmd.trim()) {
    steps.push(step("install", `cd "${cfg.workDir}" && ${cfg.installCmd}`));
  }

  // ── 3. Build ─────────────────────────────────────────────────────
  if (cfg.buildCmd.trim()) {
    steps.push(step("build", `cd "${cfg.workDir}" && ${cfg.buildCmd}`));
  }

  // ── 4. Test ──────────────────────────────────────────────────────
  if (!cfg.skipTests && cfg.testCmd.trim()) {
    steps.push(step("test", `cd "${cfg.workDir}" && ${cfg.testCmd}`));
  }

  // ── 5. Restart process ───────────────────────────────────────────
  steps.push(restartBlock(cfg));

  // ── 6. Nginx ─────────────────────────────────────────────────────
  const nginx = nginxBlock(cfg);
  if (nginx) steps.push(nginx);

  return [
    "#!/bin/bash",
    "set -o pipefail",
    "",
    `echo "Active Host Pipeline — $(date)"`,
    `echo "Repo: ${cfg.gitRepo} (${cfg.gitBranch})"`,
    "",
    ...steps,
    "",
    `echo "[PIPELINE:success]"`,
  ].join("\n");
}
