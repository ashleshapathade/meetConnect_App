import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema({
  user_id: { type: String },
  hostName: { type: String },  
  meetingCode: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
 
  link: { type: String }, 
});

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };