import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotificationWebhook extends Document {
  userId: string;
  name: string;
  url: string;
  type: "discord" | "slack" | "telegram" | "generic";
  events: string[];
  active: boolean;
  createdAt: Date;
}

export const NOTIFICATION_EVENTS = [
  "agent_offline",
  "agent_online",
  "high_cpu",
  "high_memory",
  "high_disk",
  "command_failed",
  "command_completed",
] as const;

const notificationWebhookSchema = new Schema<INotificationWebhook>(
  {
    userId:  { type: String, required: true, index: true },
    name:    { type: String, required: true },
    url:     { type: String, required: true },
    type:    { type: String, enum: ["discord", "slack", "telegram", "generic"], default: "generic" },
    events:  { type: [String], default: [] },
    active:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const NotificationWebhookModel: Model<INotificationWebhook> =
  mongoose.models.NotificationWebhook ??
  mongoose.model<INotificationWebhook>("NotificationWebhook", notificationWebhookSchema);
