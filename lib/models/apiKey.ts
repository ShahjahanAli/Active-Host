import { Schema, model, models } from "mongoose";

const apiKeySchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    hostId: { type: Schema.Types.ObjectId, required: true, ref: "Host", index: true },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

apiKeySchema.index({ hostId: 1, revokedAt: 1 });

export const ApiKeyModel = models.ApiKey ?? model("ApiKey", apiKeySchema);
