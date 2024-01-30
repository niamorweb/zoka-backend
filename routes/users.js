var express = require("express");
var router = express.Router();

require("../models/connection");
const User = require("../models/users");
const { checkBody } = require("../modules/checkBody");
// const uid2 = require("uid2");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const uniqid = require("uniqid");
const { getPublicIdFromUrl } = require("../modules/getPublicIdFromUrl");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  User.findOne({ username: username }).then((data) => {
    if (data === null) {
      const hash = bcrypt.hashSync(password, 10);

      const newUser = new User({
        username: username,
        password: hash,
        email: email,
        isPublic: false,
        description: "",
        name: username,
        photoBanner:
          "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      });

      newUser.save().then((data) => {
        const userCloudinaryFolder = `zoka/users_data/${data._id}`;
        cloudinary.api.create_folder(userCloudinaryFolder, (error, result) => {
          if (error) {
            console.error(
              "Erreur lors de la création du dossier Cloudinary :",
              error
            );
            res.json({
              result: false,
              error: "Error creating Cloudinary folder",
            });
          } else {
            res.json({ result: true, data: data });
          }
        });
      });
    } else {
      res.json({ result: false, error: "Username already exists" });
    }
  });
});

router.post("/signin", (req, res) => {
  const { username, password } = req.body;

  User.findOne({ username: username }).then((data) => {
    if (data && bcrypt.compareSync(password, data.password)) {
      res.json({ result: true, data: data });
    } else {
      res.json({ result: false, error: "User not found or wrong password" });
    }
  });
});

router.put("/updateInfos/:userId", (req, res) => {
  const userId = req.params.userId;
  const { description, name } = req.body;

  User.findByIdAndUpdate(
    userId,
    { $set: { description: description, name: name } },
    { new: true }
  )
    .then((updatedUser) => {
      if (updatedUser) {
        res.json({ result: true, data: updatedUser });
      } else {
        res.json({ result: false, error: "User not found" });
      }
    })
    .catch((error) => {
      res.json({ result: false, error: error.message });
    });
});

router.put("/updateProfilePicture/:userId", async (req, res) => {
  const { userId } = req.params;
  const id = uniqid();
  const photoPath = `/tmp/${id}.jpg`;

  const resultMove = await req.files.photoFromFront.mv(photoPath);

  if (!resultMove) {
    const resultCloudinaryNew = await cloudinary.uploader.upload(photoPath, {
      format: "webp", // Convertir en format WebP lors de l'upload
      quality: 40, // Compression automatique
      fetch_format: "auto", // Choix automatique du meilleur format de livraison
      height: 300, // Définir uniquement la hauteur souhaitée en pixels
      crop: "fill", // Adapter l'image pour remplir la hauteur spécifiée sans déformation
    });
    const newImageUrl = resultCloudinaryNew.secure_url;

    fs.unlinkSync(photoPath);

    User.findById(userId)
      .then(async (foundUser) => {
        if (foundUser && foundUser.profilePicture) {
          const publicId = foundUser.profilePicture
            .split("/")
            .pop()
            .split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        }

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $set: { profilePicture: newImageUrl } },
          { new: true }
        );

        if (updatedUser) {
          res.json({ result: true, data: updatedUser });
        } else {
          res.json({ result: false, error: "User not found" });
        }
      })
      .catch((error) => {
        res.status(500).json({ result: false, error: error.message });
      });
  } else {
    res
      .status(500)
      .json({ result: false, error: "Failed to upload profile picture" });
  }
});

router.post("/uploadPhotos/:userId", async (req, res) => {
  const { userId } = req.params;
  let images = req.files.photoFromFront;

  if (!Array.isArray(images)) {
    images = [images];
  }

  try {
    const userCloudinaryFolder = `zoka/users_data/${userId}/gallery/`;

    const uploadResults = await Promise.all(
      images.map(async (image) => {
        const id = uniqid();
        const photoPath = `tmp/${id}.jpg`;

        await image.mv(photoPath);

        const resultCloudinary = await cloudinary.uploader.upload(photoPath, {
          folder: userCloudinaryFolder, // Utiliser le dossier spécifique du user
          quality: 40,
          format: "webp",
          height: 1000,
          width: 1000,
          crop: "fit",
        });

        fs.unlinkSync(photoPath);

        return resultCloudinary.secure_url;
      })
    );

    const foundUser = await User.findById(userId);

    if (foundUser) {
      // Combine les anciennes URLs avec les nouvelles
      const combinedPhotos = [...foundUser.photos, ...uploadResults];

      // Met à jour l'utilisateur avec les URLs combinées
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { photos: combinedPhotos },
        { new: true }
      );

      if (updatedUser) {
        res.json({ result: true, data: updatedUser });
      } else {
        res.json({ result: false, error: "User not found" });
      }
    } else {
      res.json({ result: false, error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      result: false,
      error: error,
      message: "Failed to upload photos",
    });
  }
});

router.put("/:userId/updateUrl", (req, res) => {
  const userId = req.params.userId;
  const newURL = req.body.newURL;

  User.findByIdAndUpdate(userId, { photoBanner: newURL }, { new: true })
    .then((updatedUser) => {
      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, error: "Utilisateur non trouvé" });
      }
      res.status(200).json({ success: true, user: updatedUser });
    })
    .catch((err) => {
      res.status(500).json({
        success: false,
        error: "Erreur lors de la mise à jour de l'URL",
      });
    });
});

router.put("/:userId/updateLinks", (req, res) => {
  const userId = req.params.userId;
  const newLinks = req.body.links;

  User.findByIdAndUpdate(userId, { links: newLinks }, { new: true })
    .then((updatedUser) => {
      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, error: "Utilisateur non trouvé" });
      }
      res.status(200).json({ success: true, user: updatedUser });
    })
    .catch((err) => {
      res.status(500).json({
        success: false,
        error: "Erreur lors de la mise à jour des liens",
        message: err,
      });
    });
});

router.delete("/deletePhoto/:userId", async (req, res) => {
  const { userId } = req.params;
  const { photoUrl } = req.query; // Utilisation de req.query pour récupérer le paramètre de requête

  console.log(userId, photoUrl);
  try {
    // Recherche de l'utilisateur
    const foundUser = await User.findById(userId);

    if (foundUser) {
      // Suppression de l'URL spécifique du tableau photos
      const updatedPhotos = foundUser.photos.filter((url) => url !== photoUrl);

      const publicId = photoUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);

      // Met à jour l'utilisateur avec les URLs restantes
      foundUser.photos = updatedPhotos;
      const updatedUser = await foundUser.save();

      res.json({ result: true, data: updatedUser });
    } else {
      res.json({ result: false, error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, error: "Failed to delete photo" });
  }
});

router.get("/", (req, res) => {
  User.find().then((data) => {
    res.json({ result: true, data: data });
  });
});

router.get("/:userId", (req, res) => {
  User.findById(req.params.userId).then((data) => {
    res.json({ result: true, data: data });
  });
});

router.get("/findByUsername/:username", (req, res) => {
  console.log(req.params.username);
  User.findOne({ username: req.params.username }).then((data) => {
    res.json({ result: true, data: data });
  });
});

module.exports = router;
