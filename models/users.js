const mongoose = require("mongoose");

const link = mongoose.Schema({
  url: String,
  name: String,
});

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
  links: [link],
});

const User = mongoose.model("users", userSchema);

module.exports = User;
