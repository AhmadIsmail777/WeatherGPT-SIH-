import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userMessage: { type: String, required: true, maxlength: 2000 },
    assistantMessage: { type: String, required: true },
    location: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
