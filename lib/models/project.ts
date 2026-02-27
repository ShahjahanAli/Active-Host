import { Schema, model, models } from "mongoose";

/**
 * A Project represents a single application (git repo) that Active Host
 * manages: pulling code, building, testing, and restarting on a remote host.
 */
const projectSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },

    /* ── Identity ────────────────────────────────────────────────── */
    name: { type: String, required: true },
    hostId: { type: Schema.Types.ObjectId, required: true, ref: "Host", index: true },

    /* ── Git ─────────────────────────────────────────────────────── */
    gitRepo: { type: String, required: true },       // e.g. https://github.com/org/repo.git
    gitBranch: { type: String, default: "main" },

    /* ── Working directory on the remote server ───────────────────── */
    workDir: { type: String, required: true },        // e.g. /var/www/myapp

    /* ── Pipeline commands (empty = skip step) ────────────────────── */
    installCmd: { type: String, default: "npm install" },
    buildCmd:   { type: String, default: "npm run build" },
    testCmd:    { type: String, default: "" },        // empty = no test step
    skipTests:  { type: Boolean, default: false },

    /* ── Process manager ─────────────────────────────────────────── */
    processManager: {
      type: String,
      enum: ["pm2", "systemd", "docker"],
      default: "pm2",
    },
    processName: { type: String, required: true },   // PM2 app name / systemd unit / container name
    dockerComposeFile: { type: String, default: "docker-compose.yml" },

    /* ── Nginx ───────────────────────────────────────────────────── */
    nginxEnabled: { type: Boolean, default: true },
    domain: { type: String, default: "" },           // e.g. myapp.example.com
    nginxPort: { type: Number, default: 3000 },      // upstream port the app listens on

    /* ── GitHub Webhook ──────────────────────────────────────────── */
    webhookSecret: { type: String, default: "" },    // HMAC secret for GitHub webhook
  },
  { timestamps: true }
);

export const ProjectModel = models.Project ?? model("Project", projectSchema);
