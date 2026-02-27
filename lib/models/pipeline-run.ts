import { Schema, model, models } from "mongoose";

/**
 * A single execution of a project's deployment pipeline.
 * Each run maps to one Command queued on the remote agent.
 */
const pipelineRunSchema = new Schema(
  {
    ownerId:    { type: String, required: true, index: true },
    projectId:  { type: Schema.Types.ObjectId, required: true, ref: "Project", index: true },
    hostId:     { type: Schema.Types.ObjectId, required: true, ref: "Host" },

    /** The underlying Command document that the agent executes */
    commandId:  { type: Schema.Types.ObjectId, ref: "Command", default: null },

    /** How the run was triggered */
    trigger: {
      type: String,
      enum: ["manual", "webhook"],
      default: "manual",
    },

    status: {
      type: String,
      enum: ["pending", "running", "succeeded", "failed"],
      default: "pending",
      index: true,
    },

    /* ── Git context (from webhook payload or git log) ────────────── */
    commitSha:     { type: String, default: "" },
    commitMessage: { type: String, default: "" },
    pushedBy:      { type: String, default: "" },
    branch:        { type: String, default: "" },

    /* ── Timing ──────────────────────────────────────────────────── */
    startedAt:    { type: Date, default: null },
    completedAt:  { type: Date, default: null },

    /** Full log output captured from the agent command */
    output: { type: String, default: "" },
  },
  { timestamps: true }
);

export const PipelineRunModel =
  models.PipelineRun ?? model("PipelineRun", pipelineRunSchema);
