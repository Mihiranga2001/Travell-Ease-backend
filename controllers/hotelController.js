import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";
import User from "../models/User.js";

function getErrorMessage(error) {
  if (error.name === "ValidationError") {
    return Object.values(error.errors)
      .map((item) => item.message)
      .join(", ");
  }

  if (error.code === 11000) {
    return "A hotel with the same unique information already exists";
  }

  return error.message || "Something went wrong";
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function convertToBoolean(value) {
  return value === true || value === "true";
}

function cleanImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => String(image).trim())
    .filter((image) => image !== "");
}

function cleanRoomTypes(roomTypes) {
  if (!Array.isArray(roomTypes)) {
    return roomTypes;
  }

  return roomTypes.map((room) => ({
    name: String(room.name ?? "").trim(),
    pricePerNight: Number(room.pricePerNight),
    capacity: Number(room.capacity),
  }));
}

function buildHotelPayload(body) {
  const payload = {};

  if (body.ownerId !== undefined) {
    payload.ownerId = String(body.ownerId).trim();
  }

  if (body.name !== undefined) {
    payload.name = String(body.name).trim();
  }

  if (body.description !== undefined) {
    payload.description = String(body.description).trim();
  }

  if (body.address !== undefined) {
    payload.address = String(body.address).trim();
  }

  if (body.location !== undefined) {
    payload.location = {
      latitude:
        body.location?.latitude === "" ||
        body.location?.latitude === undefined ||
        body.location?.latitude === null
          ? 0
          : Number(body.location.latitude),
      longitude:
        body.location?.longitude === "" ||
        body.location?.longitude === undefined ||
        body.location?.longitude === null
          ? 0
          : Number(body.location.longitude),
    };
  }

  if (body.images !== undefined) {
    payload.images = cleanImages(body.images);
  }

  if (body.roomTypes !== undefined) {
    payload.roomTypes = cleanRoomTypes(body.roomTypes);
  }

  if (body.contactNumber !== undefined) {
    payload.contactNumber = String(body.contactNumber).trim();
  }

  if (body.rating !== undefined) {
    payload.rating = Number(body.rating);
  }

  if (body.isAvailable !== undefined) {
    payload.isAvailable = convertToBoolean(body.isAvailable);
  }

  if (body.isApproved !== undefined) {
    payload.isApproved = convertToBoolean(body.isApproved);
  }

  return payload;
}

async function validateOwner(ownerId) {
  if (!ownerId) {
    return {
      valid: false,
      status: 400,
      message: "Hotel owner is required",
    };
  }

  if (!isValidId(ownerId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid owner ID",
    };
  }

  const ownerExists = await User.exists({ _id: ownerId });

  if (!ownerExists) {
    return {
      valid: false,
      status: 404,
      message: "Hotel owner was not found",
    };
  }

  return { valid: true };
}

// GET /api/hotels
// Public: returns only approved and available hotels
export async function getAllHotels(req, res) {
  try {
    const hotels = await Hotel.find({
      isApproved: true,
      isAvailable: true,
    })
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: hotels.length,
      hotels,
    });
  } catch (error) {
    console.error("Get hotels error:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

// GET /api/hotels/admin/all
// Admin: returns every hotel
export async function getAllHotelsForAdmin(req, res) {
  try {
    const hotels = await Hotel.find()
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: hotels.length,
      hotels,
    });
  } catch (error) {
    console.error("Get admin hotels error:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

// GET /api/hotels/:id
export async function getHotelById(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const hotel = await Hotel.findById(id).populate(
      "ownerId",
      "name email"
    );

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    return res.status(200).json({
      success: true,
      hotel,
    });
  } catch (error) {
    console.error("Get hotel error:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

// POST /api/hotels
export async function createHotel(req, res) {
  try {
    const hotelPayload = buildHotelPayload(req.body);

    const ownerValidation = await validateOwner(hotelPayload.ownerId);

    if (!ownerValidation.valid) {
      return res.status(ownerValidation.status).json({
        success: false,
        message: ownerValidation.message,
      });
    }

    const hotel = await Hotel.create(hotelPayload);

    const createdHotel = await Hotel.findById(hotel._id).populate(
      "ownerId",
      "name email"
    );

    return res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      hotel: createdHotel,
    });
  } catch (error) {
    console.error("Create hotel error:", error);

    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

// PUT /api/hotels/:id
export async function updateHotel(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const existingHotel = await Hotel.findById(id);

    if (!existingHotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    const hotelPayload = buildHotelPayload(req.body);

    if (hotelPayload.ownerId !== undefined) {
      const ownerValidation = await validateOwner(hotelPayload.ownerId);

      if (!ownerValidation.valid) {
        return res.status(ownerValidation.status).json({
          success: false,
          message: ownerValidation.message,
        });
      }
    }

    const updatedHotel = await Hotel.findByIdAndUpdate(
      id,
      { $set: hotelPayload },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    ).populate("ownerId", "name email");

    return res.status(200).json({
      success: true,
      message: "Hotel updated successfully",
      hotel: updatedHotel,
    });
  } catch (error) {
    console.error("Update hotel error:", error);

    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

// DELETE /api/hotels/:id
export async function deleteHotel(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const deletedHotel = await Hotel.findByIdAndDelete(id);

    if (!deletedHotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotel deleted successfully",
    });
  } catch (error) {
    console.error("Delete hotel error:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

// PUT /api/hotels/:id/approve
export async function approveHotel(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const hotel = await Hotel.findByIdAndUpdate(
      id,
      { $set: { isApproved: true } },
      {
        new: true,
        runValidators: true,
      }
    ).populate("ownerId", "name email");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotel approved successfully",
      hotel,
    });
  } catch (error) {
    console.error("Approve hotel error:", error);

    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

// PUT /api/hotels/:id/reject
export async function rejectHotel(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const hotel = await Hotel.findByIdAndUpdate(
      id,
      { $set: { isApproved: false } },
      {
        new: true,
        runValidators: true,
      }
    ).populate("ownerId", "name email");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotel rejected successfully",
      hotel,
    });
  } catch (error) {
    console.error("Reject hotel error:", error);

    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}