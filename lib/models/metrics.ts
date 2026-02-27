import { Schema, model, models } from "mongoose";

/* ── sub-schemas ── */
const CpuSchema = new Schema(
  { count: Number, model: String, usagePercent: Number },
  { _id: false }
);

const MemorySchema = new Schema(
  { totalBytes: Number, freeBytes: Number, usedBytes: Number, usagePercent: Number },
  { _id: false }
);

const DiskSchema = new Schema(
  { mount: String, totalBytes: Number, freeBytes: Number, usedBytes: Number, usagePercent: Number },
  { _id: false }
);

const NetworkSchema = new Schema(
  {
    interface: String,
    address: { type: String, default: null },
    rxBytes: { type: Number, default: 0 },
    txBytes: { type: Number, default: 0 },
    rxBytesPerSec: { type: Number, default: 0 },
    txBytesPerSec: { type: Number, default: 0 },
  },
  { _id: false }
);

const LoadSchema = new Schema(
  { avg1: Number, avg5: Number, avg15: Number },
  { _id: false }
);

/* ── main schema ── */
const metricsSchema = new Schema(
  {
    hostId:          { type: Schema.Types.ObjectId, required: true, ref: "Host", index: true },
    agentId:         { type: String, required: true, index: true },
    collectedAt:     { type: Date, required: true, index: true },
    cpu:             { type: CpuSchema },
    memory:          { type: MemorySchema },
    disks:           { type: [DiskSchema], default: [] },
    network:         { type: [NetworkSchema], default: [] },
    load:            { type: LoadSchema },
    uptimeSeconds:   { type: Number, default: 0 },
    activeProcesses: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    // automatically expire documents older than 24 h (TTL index)
    // set to 0 to keep forever
  }
);

// TTL: keep only 24 hours of metrics (adjust as needed)
metricsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const MetricsModel = models.Metrics ?? model("Metrics", metricsSchema);
