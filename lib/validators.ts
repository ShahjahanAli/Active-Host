import { z } from "zod";

const cpuMetricsSchema = z.object({
  count: z.number(),
  model: z.string(),
  usagePercent: z.number(),
});

const memoryMetricsSchema = z.object({
  totalBytes: z.number(),
  freeBytes: z.number(),
  usedBytes: z.number(),
  usagePercent: z.number(),
});

const diskMetricsSchema = z.object({
  mount: z.string(),
  totalBytes: z.number(),
  freeBytes: z.number(),
  usedBytes: z.number(),
  usagePercent: z.number(),
});

const networkMetricsSchema = z.object({
  interface: z.string(),
  address: z.string().nullable().default(null),
  rxBytes: z.number().default(0),
  txBytes: z.number().default(0),
  rxBytesPerSec: z.number().default(0),
  txBytesPerSec: z.number().default(0),
});

const loadMetricsSchema = z.object({
  avg1: z.number(),
  avg5: z.number(),
  avg15: z.number(),
});

export const systemMetricsSchema = z.object({
  collectedAt: z.string().datetime(),
  cpu: cpuMetricsSchema,
  memory: memoryMetricsSchema,
  disks: z.array(diskMetricsSchema).default([]),
  network: z.array(networkMetricsSchema).default([]),
  load: loadMetricsSchema,
  uptimeSeconds: z.number().default(0),
  activeProcesses: z.number().default(0),
});

export const agentMetricsSchema = z.object({
  agentId: z.string().min(5),
  apiKey: z.string().min(10),
  metrics: systemMetricsSchema,
});

export const createHostSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().min(2).max(255),
  environment: z.string().min(2).max(50).default("production"),
  tags: z.array(z.string().min(1).max(40)).default([])
});

export const registerAgentSchema = z.object({
  agentId: z.string().min(5),
  apiKey: z.string().min(10),
  hostname: z.string().optional(),
  os: z.string().optional(),
  ip: z.string().optional(),
  version: z.string().optional()
});

export const createCommandSchema = z.object({
  hostId: z.string().min(8),
  command: z.string().min(1).max(4000)
});

export const commandUpdateSchema = z.object({
  commandId: z.string().min(8),
  status: z.enum(["running", "succeeded", "failed", "cancelled"]),
  output: z.string().optional(),
  error: z.string().optional()
});

/* ── CI/CD — Projects ────────────────────────────────────────────── */

export const createProjectSchema = z.object({
  name:              z.string().min(2).max(120),
  hostId:            z.string().min(8),
  gitRepo:           z.string().url(),
  gitBranch:         z.string().min(1).max(255).default("main"),
  workDir:           z.string().min(1).max(500),
  installCmd:        z.string().max(500).default("npm install"),
  buildCmd:          z.string().max(500).default("npm run build"),
  testCmd:           z.string().max(500).default(""),
  skipTests:         z.boolean().default(false),
  processManager:    z.enum(["pm2", "systemd", "docker"]).default("pm2"),
  processName:       z.string().min(1).max(120),
  dockerComposeFile: z.string().max(255).default("docker-compose.yml"),
  nginxEnabled:      z.boolean().default(true),
  domain:            z.string().max(255).default(""),
  nginxPort:         z.number().int().min(1).max(65535).default(3000),
  webhookSecret:     z.string().max(255).default(""),
});

export const updateProjectSchema = createProjectSchema.partial();
