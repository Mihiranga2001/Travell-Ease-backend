import express from "express";
import multer from "multer";
import path from "path";

import {
  createTouristPlace,
  getAllTouristPlaces,
  getSingleTouristPlace,
  updateTouristPlace,
  deleteTouristPlace,
} from "../controllers/touristPlaceController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("image"), createTouristPlace);
router.get("/", getAllTouristPlaces);
router.get("/:id", getSingleTouristPlace);
router.put("/:id", upload.single("image"), updateTouristPlace);
router.delete("/:id", deleteTouristPlace);

export default router;