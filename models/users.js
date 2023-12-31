const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  isAdmin: String,
  username: String,
  password: String,
});

const User = mongoose.model("users", userSchema);

module.exports = User;
