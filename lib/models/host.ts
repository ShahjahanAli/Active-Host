import { Schema, model, models } from "mongoose";

const hostSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    environment: { type: String, required: true, default: "production" },
    tags: { type: [String], default: [] },
    agentId: { type: String, required: true, unique: true, index: true }
  },
  { timestamps: true }
);

export const HostModel = models.Host ?? model("Host", hostSchema);
