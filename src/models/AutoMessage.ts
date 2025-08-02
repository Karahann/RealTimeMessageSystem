import mongoose, { Document, Schema } from "mongoose";

export interface IAutoMessage extends Document {
  _id: string;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  sendDate: Date;
  isQueued: boolean;
  isSent: boolean;
  queuedAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const autoMessageSchema = new Schema<IAutoMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    sendDate: {
      type: Date,
      required: true,
      index: true,
    },
    isQueued: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    queuedAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for queue processing
autoMessageSchema.index({ sendDate: 1, isQueued: 1 });
autoMessageSchema.index({ isQueued: 1, isSent: 1 });

export const AutoMessage = mongoose.model<IAutoMessage>(
  "AutoMessage",
  autoMessageSchema
);
