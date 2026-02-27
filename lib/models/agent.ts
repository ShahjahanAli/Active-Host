import { Schema, model, models } from "mongoose";

const agentSchema = new Schema(
  {
    hostId: { type: Schema.Types.ObjectId, required: true, ref: "Host", unique: true, index: true },
    agentId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["online", "offline"], default: "offline", index: true },
    hostname: { type: String, default: null },
    os: { type: String, default: null },
    ip: { type: String, default: null },
    version: { type: String, default: null },
    lastHeartbeatAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const AgentModel = models.Agent ?? model("Agent", agentSchema);
