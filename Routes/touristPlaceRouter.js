import express from "express";

import {
  getAllTouristPlaces,
  getTouristPlaceById,
  createTouristPlace,
  updateTouristPlace,
  deleteTouristPlace,
} from "../controllers/touristPlaceController.js";

const router = express.Router();

// Get all tourist places
router.get("/", getAllTouristPlaces);

// Get one tourist place
router.get("/:id", getTouristPlaceById);

// Add a new tourist place
router.post("/", createTouristPlace);

// Update a tourist place
router.put("/:id", updateTouristPlace);

// Delete a tourist place
router.delete("/:id", deleteTouristPlace);

export default router;