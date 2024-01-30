var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
require("dotenv").config();

var logger = require("morgan");
const cors = require("cors");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();
const allowedOrigins = ["https://zoka-rouge.vercel.app"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(
  fileUpload({
    limits: { fileSize: 300 * 1024 * 1024 },
    abortOnLimit: true,
  })
);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

module.exports = app;
