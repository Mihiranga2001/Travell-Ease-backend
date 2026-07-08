import TouristPlace from "../models/TouristPlace.js";

export const createTouristPlace = async (req, res) => {
  try {
    const { name, category, location, district, description, rating, status } =
      req.body;

    if (!name || !category || !location || !description) {
      return res.status(400).json({
        message: "Name, category, location and description are required",
      });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : "";

    const place = await TouristPlace.create({
      name,
      category,
      location,
      district,
      description,
      rating: rating || 4.5,
      status: status || "approved",
      image,
    });

    res.status(201).json({
      message: "Tourist place added successfully",
      place,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add tourist place",
      error: error.message,
    });
  }
};

export const getAllTouristPlaces = async (req, res) => {
  try {
    const places = await TouristPlace.find().sort({ createdAt: -1 });

    res.status(200).json({
      places,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tourist places",
      error: error.message,
    });
  }
};

export const getSingleTouristPlace = async (req, res) => {
  try {
    const place = await TouristPlace.findById(req.params.id);

    if (!place) {
      return res.status(404).json({ message: "Tourist place not found" });
    }

    res.status(200).json({ place });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tourist place",
      error: error.message,
    });
  }
};

export const updateTouristPlace = async (req, res) => {
  try {
    const { name, category, location, district, description, rating, status } =
      req.body;

    const updateData = {
      name,
      category,
      location,
      district,
      description,
      rating,
      status,
    };

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const place = await TouristPlace.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!place) {
      return res.status(404).json({ message: "Tourist place not found" });
    }

    res.status(200).json({
      message: "Tourist place updated successfully",
      place,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update tourist place",
      error: error.message,
    });
  }
};

export const deleteTouristPlace = async (req, res) => {
  try {
    const place = await TouristPlace.findByIdAndDelete(req.params.id);

    if (!place) {
      return res.status(404).json({ message: "Tourist place not found" });
    }

    res.status(200).json({
      message: "Tourist place deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete tourist place",
      error: error.message,
    });
  }
};