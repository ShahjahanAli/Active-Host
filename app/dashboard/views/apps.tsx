"use client";

import { useState } from "react";
import { runAgentCommand } from "../run-agent-command";

type Cls = { inputCls: string; btnPrimary: string; btnSecondary: string };

type AppTemplate = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  tags: string[];
  buildCommand: (opts: Record<string, string>) => string;
  options: { key: string; label: string; placeholder: string; default?: string }[];
};

const TEMPLATES: AppTemplate[] = [
  {
    id: "wordpress",
    name: "WordPress",
    desc: "Full LEMP stack with PHP 8.2, MySQL/MariaDB, and WordPress auto-install.",
    icon: "🐘",
    color: "border-blue-500/20 bg-blue-500/5",
    tags: ["PHP", "MySQL", "LEMP"],
    options: [
      { key: "domain",    label: "Domain",     placeholder: "example.com" },
      { key: "dbName",    label: "DB Name",    placeholder: "wordpress",   default: "wordpress" },
      { key: "dbUser",    label: "DB User",    placeholder: "wpuser",      default: "wpuser" },
      { key: "dbPass",    label: "DB Password",placeholder: "secure_pass"  },
    ],
    buildCommand: (o) => `
      apt-get update -qq
      apt-get install -y -qq nginx php8.2-fpm php8.2-mysql mariadb-server curl unzip 2>/dev/null
      mysql -e "CREATE DATABASE IF NOT EXISTS ${o.dbName}; CREATE USER IF NOT EXISTS '${o.dbUser}'@'localhost' IDENTIFIED BY '${o.dbPass}'; GRANT ALL ON ${o.dbName}.* TO '${o.dbUser}'@'localhost'; FLUSH PRIVILEGES;"
      mkdir -p /var/www/${o.domain}
      curl -s https://wordpress.org/latest.tar.gz | tar xz -C /tmp
      cp -r /tmp/wordpress/. /var/www/${o.domain}/
      cp /var/www/${o.domain}/wp-config-sample.php /var/www/${o.domain}/wp-config.php
      sed -i "s/database_name_here/${o.dbName}/; s/username_here/${o.dbUser}/; s/password_here/${o.dbPass}/" /var/www/${o.domain}/wp-config.php
      chown -R www-data:www-data /var/www/${o.domain}
      echo "WordPress deployed to /var/www/${o.domain}"
    `.trim().replace(/\n\s+/g, " && "),
  },
  {
    id: "flask",
    name: "Flask / Gunicorn",
    desc: "Python 3 virtualenv with Flask + Gunicorn behind Nginx reverse proxy.",
    icon: "🐍",
    color: "border-emerald-500/20 bg-emerald-500/5",
    tags: ["Python", "Gunicorn", "Nginx"],
    options: [
      { key: "appDir",  label: "App directory",  placeholder: "/srv/flask-app", default: "/srv/flask-app" },
      { key: "port",    label: "Gunicorn port",   placeholder: "8000",           default: "8000" },
      { key: "appMod",  label: "WSGI entry",      placeholder: "app:app",        default: "app:app" },
    ],
    buildCommand: (o) => `
      apt-get install -y -qq python3 python3-pip python3-venv nginx
      mkdir -p ${o.appDir}
      python3 -m venv ${o.appDir}/venv
      ${o.appDir}/venv/bin/pip install flask gunicorn -q
      cat > ${o.appDir}/app.py << 'EOF'
from flask import Flask; app = Flask(__name__); @app.route('/') 
def hello(): return '<h1>Flask is running!</h1>'
EOF
      cat > /etc/systemd/system/flask-app.service << EOF
[Unit] Description=Flask App After=network.target
[Service] WorkingDirectory=${o.appDir} ExecStart=${o.appDir}/venv/bin/gunicorn -w 4 -b 127.0.0.1:${o.port} ${o.appMod} Restart=always
[Install] WantedBy=multi-user.target
EOF
      systemctl daemon-reload && systemctl enable flask-app && systemctl start flask-app
      echo "Flask app deployed on port ${o.port}"
    `.trim().replace(/\n\s+/g, " && "),
  },
  {
    id: "nodejs",
    name: "Node.js + PM2",
    desc: "Node.js application managed by PM2 with auto-restart and log streaming.",
    icon: "🟢",
    color: "border-green-500/20 bg-green-500/5",
    tags: ["Node.js", "PM2", "npm"],
    options: [
      { key: "appDir",  label: "App directory", placeholder: "/srv/node-app", default: "/srv/node-app" },
      { key: "entry",   label: "Entry point",   placeholder: "index.js",      default: "index.js" },
      { key: "appName", label: "PM2 app name",  placeholder: "my-app",        default: "my-app" },
    ],
    buildCommand: (o) => `
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
      npm install -g pm2 -q
      mkdir -p ${o.appDir}
      if [ ! -f "${o.appDir}/package.json" ]; then
        echo '{"name":"${o.appName}","version":"1.0.0","main":"${o.entry}"}' > ${o.appDir}/package.json
        echo 'const http = require("http"); http.createServer((_, r) => r.end("Hello from Node!")).listen(3000);' > ${o.appDir}/${o.entry}
      fi
      cd ${o.appDir} && pm2 start ${o.entry} --name ${o.appName} && pm2 save && pm2 startup systemd -u root --hp /root
      echo "Node.js app '${o.appName}' started with PM2"
    `.trim().replace(/\n\s+/g, " && "),
  },
  {
    id: "docker-compose",
    name: "Custom Docker App",
    desc: "Deploy any Docker Compose-based application from a remote git URL.",
    icon: "🐳",
    color: "border-cyan-500/20 bg-cyan-500/5",
    tags: ["Docker", "Compose"],
    options: [
      { key: "repoUrl", label: "Git repo URL",    placeholder: "https://github.com/org/app.git" },
      { key: "appDir",  label: "Clone directory", placeholder: "/srv/docker-app", default: "/srv/docker-app" },
    ],
    buildCommand: (o) => `
      apt-get install -y -qq docker.io docker-compose-plugin git
      systemctl enable docker && systemctl start docker
      if [ -d "${o.appDir}/.git" ]; then cd ${o.appDir} && git pull; else git clone ${o.repoUrl} ${o.appDir}; fi
      cd ${o.appDir} && docker compose up -d
      echo "Docker app deployed from ${o.repoUrl}"
    `.trim().replace(/\n\s+/g, " && "),
  },
];

export function AppsView(props: { hostId: string } & Cls) {
  const { hostId, inputCls, btnPrimary, btnSecondary } = props;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [opts, setOpts]         = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [output, setOutput]     = useState("");
  const [pm2List, setPm2List]   = useState("");

  const expand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (tpl) {
      const defaults: Record<string, string> = {};
      tpl.options.forEach((o) => { if (o.default) defaults[o.key] = o.default; });
      setOpts(defaults);
    }
    setExpanded(id);
    setOutput("");
  };

  const deploy = async (tpl: AppTemplate) => {
    const allFilled = tpl.options.every((o) => opts[o.key] || o.default);
    if (!allFilled) return;
    setLoading(true);
    const cmd = tpl.buildCommand(opts);
    const r = await runAgentCommand(hostId, cmd, 180_000);
    setOutput(r.output);
    setLoading(false);
  };

  const loadPm2 = async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, "pm2 list --no-color 2>/dev/null || echo 'PM2 not installed'");
    setPm2List(r.output);
    setLoading(false);
  };

  if (!hostId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-20 text-center">
        <span className="text-4xl mb-3">🚀</span>
        <p className="text-slate-400">Select a host to deploy applications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">One-click deploy to the selected host. Commands run via the agent with sudo.</p>

      {/* Template cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((tpl) => (
          <div key={tpl.id} className={`rounded-xl border ${tpl.color} overflow-hidden`}>
            <button
              onClick={() => expand(tpl.id)}
              className="w-full text-left p-5 hover:bg-white/5 transition"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{tpl.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{tpl.name}</p>
                    <span className="text-xs text-slate-500">{expanded === tpl.id ? "▲" : "▼"}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{tpl.desc}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tpl.tags.map((tag) => (
                      <span key={tag} className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-500">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {expanded === tpl.id && (
              <div className="border-t border-white/10 p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-2">
                  {tpl.options.map((o) => (
                    <div key={o.key}>
                      <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">{o.label}</label>
                      <input
                        value={opts[o.key] ?? ""}
                        onChange={(e) => setOpts({ ...opts, [o.key]: e.target.value })}
                        placeholder={o.placeholder}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => void deploy(tpl)}
                  disabled={loading}
                  className={`${btnPrimary} flex items-center gap-1.5`}
                >
                  {loading ? "⏳ Deploying…" : `🚀 Deploy ${tpl.name}`}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PM2 Process List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">PM2 Processes</h3>
          <button onClick={() => void loadPm2()} disabled={loading} className={`${btnSecondary} flex items-center gap-1.5`}>
            {loading ? "⏳" : "🔄"} Refresh
          </button>
        </div>
        {pm2List ? (
          <pre className="text-[10px] font-mono text-slate-400 overflow-auto max-h-48 whitespace-pre-wrap">{pm2List}</pre>
        ) : (
          <p className="text-xs text-slate-600 italic">Click refresh to load PM2 process list.</p>
        )}
      </div>

      {/* Deploy output */}
      {output && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">Deploy Output</p>
          <pre className="text-[10px] font-mono text-slate-400 overflow-auto max-h-64 whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}
