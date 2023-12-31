const mongoose = require("mongoose");

const linkInfo = mongoose.Schema({
  name: String,
  url: String,
});

const linkSchema = mongoose.Schema({
  linkInfo: [linkInfo],
  image: String,
  firstName: String,
  lastName: String,
  email: String,
  creator: {
    type: mongoose.ObjectId,
    ref: "users",
  },
});

const Link = mongoose.model("links", linkSchema);

module.exports = Link;
