import mongoose, { Document, Schema } from "mongoose";

export interface IConversation extends Document {
  _id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for participants
conversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema
);
