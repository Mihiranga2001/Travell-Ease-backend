import TouristPlace from "../models/touristPlace.js";

const ALLOWED_FIELDS = [
  "name",
  "category",
  "location",
  "district",
  "description",
  "image",
  "rating",
  "status",
];

function getAllowedPlaceData(body) {
  const placeData = {};

  ALLOWED_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      placeData[field] = body[field];
    }
  });

  return placeData;
}

function sendError(res, error, defaultMessage) {
  console.error(error);

  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map(
      (item) => item.message
    );

    return res.status(400).json({
      success: false,
      message: messages.join(", "),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid tourist place ID",
    });
  }

  return res.status(500).json({
    success: false,
    message: defaultMessage,
  });
}

// GET /api/places
export async function getAllTouristPlaces(req, res) {
  try {
    const places = await TouristPlace.find().sort({
      createdAt: -1,
    });

    return res.status(200).json(places);
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to load tourist places"
    );
  }
}

// GET /api/places/:id
export async function getTouristPlaceById(req, res) {
  try {
    const place = await TouristPlace.findById(req.params.id);

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Tourist place not found",
      });
    }

    return res.status(200).json(place);
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to load tourist place"
    );
  }
}

// POST /api/places
export async function createTouristPlace(req, res) {
  try {
    const placeData = getAllowedPlaceData(req.body);

    const newPlace = await TouristPlace.create(placeData);

    return res.status(201).json({
      success: true,
      message: "Tourist place added successfully",
      place: newPlace,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to add tourist place"
    );
  }
}

// PUT /api/places/:id
export async function updateTouristPlace(req, res) {
  try {
    const placeData = getAllowedPlaceData(req.body);

    const updatedPlace =
      await TouristPlace.findByIdAndUpdate(
        req.params.id,
        placeData,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedPlace) {
      return res.status(404).json({
        success: false,
        message: "Tourist place not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tourist place updated successfully",
      place: updatedPlace,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to update tourist place"
    );
  }
}

// DELETE /api/places/:id
export async function deleteTouristPlace(req, res) {
  try {
    const deletedPlace =
      await TouristPlace.findByIdAndDelete(req.params.id);

    if (!deletedPlace) {
      return res.status(404).json({
        success: false,
        message: "Tourist place not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tourist place deleted successfully",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to delete tourist place"
    );
  }
}