import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    location: { type: String, required: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    severity: { type: String, required: true, maxlength: 30 },
    title: { type: String, required: true, maxlength: 255 },
    message: { type: String, required: true, maxlength: 5000 },
    alertType: { type: String, required: true, maxlength: 80 },
    source: { type: String, default: "derived" },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.models.Alert || mongoose.model("Alert", alertSchema);
