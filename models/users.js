const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  username: String,
  name: String,
  description: String,
  email: String,
  password: String,
  isPublic: Boolean,
  profilePicture: String,
  photos: [String],
  photoBanner: String,
});

const User = mongoose.model("users", userSchema);

module.exports = User;
