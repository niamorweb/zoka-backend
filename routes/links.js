var express = require("express");
var router = express.Router();
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const uniqid = require("uniqid");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

require("../models/connection");
const Link = require("../models/links");

router.post("/addLink", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      image,
      linkInfo,
      photoFromFront,
      userId,
    } = req.body;

    const linkInfoJson = JSON.parse(linkInfo);

    console.log(linkInfo);
    console.log(linkInfoJson);

    const id = uniqid();
    const photoPath = `./tmp/${id}.jpg`;

    const resultMove = await req.files.photoFromFront.mv(photoPath);

    if (!resultMove) {
      const resultCloudinary = await cloudinary.uploader.upload(photoPath);
      const imageUrl = resultCloudinary.secure_url;

      fs.unlinkSync(photoPath);

      // Vérifiez s'il existe déjà un lien pour cet utilisateur
      const existingLink = await Link.findOne({ creator: req.body.userId });

      if (existingLink) {
        return res.json({
          success: false,
          message: "Un lien avec cet utilisateur existe déjà",
        });
      } else {
        const newLink = new Link({
          linkInfo: linkInfoJson,
          image: imageUrl,
          firstName: firstName,
          lastName: lastName,
          email: email,
          creator: userId,
        });

        const savedLink = await newLink.save();

        const populatedData = await Link.populate(savedLink, {
          path: "creator",
        });

        return res.json({ result: true, data: populatedData });
      }
    } else {
      throw new Error("Erreur lors du téléversement de l'image.");
    }
  } catch (error) {
    console.error("Une erreur est survenue :", error.message);
    return res.json({ result: false, error: error.message });
  }
});

router.delete("/deleteLink/:id", async (req, res) => {
  const linkId = req.params.id;

  Link.findByIdAndDelete(linkId);
  try {
    const linkToDelete = await Link.findById(linkId);

    if (!linkToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Lien non trouvé" });
    }

    const imageUrl = linkToDelete.image;
    const imagePublicId = imageUrl.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(imagePublicId);
    await Link.findByIdAndDelete(linkId);

    res.json({ success: true, message: "Image deleted with success" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", (req, res) => {
  Link.find().then((links) => {
    res.json({ success: true, data: links });
  });
});

router.get("/findById/:linkId", (req, res) => {
  const { linkId } = req.params;
  Link.find({ _id: linkId }).then((link) => {
    res.json({ success: true, data: link });
  });
});

router.get("/findByCreator/:creatorId", (req, res) => {
  const { creatorId } = req.params;
  Link.find({ creator: creatorId }).then((links) => {
    res.json({ success: true, data: links });
  });
});

module.exports = router;
