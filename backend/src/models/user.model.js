import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  token: { type: String },
  
  resetToken: String,
  resetTokenExpire: Date,
});

const User = mongoose.model("User", userSchema);

export { User };