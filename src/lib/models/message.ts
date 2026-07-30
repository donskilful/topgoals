import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { MESSAGE_TOPICS } from "@/lib/constants";

const messageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    topic: { type: String, enum: MESSAGE_TOPICS, required: true },
    body: { type: String, required: true, trim: true },
    handled: { type: Boolean, required: true, default: false },
    /** Who marked it handled, so the inbox shows who dealt with what. */
    handledBy: { type: String, default: null },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ handled: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof messageSchema>;

export const Message: Model<MessageDoc> =
  (mongoose.models.Message as Model<MessageDoc>) ??
  mongoose.model<MessageDoc>("Message", messageSchema);
