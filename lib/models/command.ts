import { Schema, model, models } from "mongoose";

const commandSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    hostId: { type: Schema.Types.ObjectId, required: true, ref: "Host", index: true },
    agentId: { type: String, required: true, index: true },
    command: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "running", "succeeded", "failed", "cancelled"],
      default: "queued",
      index: true
    },
    output: { type: String, default: "" },
    error: { type: String, default: "" },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const CommandModel = models.Command ?? model("Command", commandSchema);
