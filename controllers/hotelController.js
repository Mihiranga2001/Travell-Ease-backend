import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";
import User from "../models/User.js";

function getLoggedInUserId(req) {
  return req.user?.userId || req.user?.id || req.user?._id || null;
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
    .map((image) => String(image || "").trim())
    .filter(Boolean);
}

function cleanRoomTypes(roomTypes, existingRoomTypes = []) {
  if (!Array.isArray(roomTypes)) {
    return roomTypes;
  }

  return roomTypes.map((room, index) => {
    const existingRoom = existingRoomTypes[index] || {};

    return {
      name: String(room?.name || "").trim(),
      pricePerNight: Number(room?.pricePerNight),
      capacity: Number(room?.capacity),

      images: Array.isArray(room?.images)
        ? cleanImages(room.images)
        : cleanImages(existingRoom.images),

      totalRooms:
        room?.totalRooms === undefined ||
        room?.totalRooms === null ||
        room?.totalRooms === ""
          ? Number(existingRoom.totalRooms || 1)
          : Number(room.totalRooms),

      isAvailable:
        room?.isAvailable === undefined
          ? existingRoom.isAvailable !== false
          : convertToBoolean(room.isAvailable),
    };
  });
}

function cleanLocation(location) {
  return {
    latitude:
      location?.latitude === "" ||
      location?.latitude === undefined ||
      location?.latitude === null
        ? 0
        : Number(location.latitude),

    longitude:
      location?.longitude === "" ||
      location?.longitude === undefined ||
      location?.longitude === null
        ? 0
        : Number(location.longitude),
  };
}

function getErrorMessage(error) {
  if (error?.name === "ValidationError") {
    return Object.values(error.errors)
      .map((item) => item.message)
      .join(", ");
  }

  if (error?.name === "CastError") {
    return "Invalid ID";
  }

  if (error?.code === 11000) {
    return "Duplicate data already exists";
  }

  return error?.message || "Something went wrong";
}

function sendError(res, error, fallbackMessage, status = 500) {
  console.error(fallbackMessage, error);

  const responseStatus =
    error?.name === "ValidationError" ||
    error?.name === "CastError"
      ? 400
      : status;

  return res.status(responseStatus).json({
    success: false,
    message:
      error?.name === "ValidationError" ||
      error?.name === "CastError"
        ? getErrorMessage(error)
        : fallbackMessage,
  });
}

async function validateHotelOwner(ownerId) {
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
      message: "Invalid hotel owner ID",
    };
  }

  const owner = await User.findById(ownerId).select(
    "name email role isBlocked"
  );

  if (!owner) {
    return {
      valid: false,
      status: 404,
      message: "Hotel owner was not found",
    };
  }

  if (owner.isBlocked) {
    return {
      valid: false,
      status: 403,
      message: "This hotel owner account is blocked",
    };
  }

  if (owner.role !== "hotel_owner") {
    return {
      valid: false,
      status: 400,
      message: "Selected user is not a hotel owner",
    };
  }

  return {
    valid: true,
    owner,
  };
}

function buildOwnerHotelPayload(body, existingHotel = null) {
  return {
    name: String(body.name || "").trim(),
    description: String(body.description || "").trim(),
    address: String(body.address || "").trim(),
    location: cleanLocation(body.location),
    images: cleanImages(body.images),

    roomTypes: cleanRoomTypes(
      body.roomTypes,
      existingHotel?.roomTypes || []
    ),

    contactNumber: String(body.contactNumber || "").trim(),

    isAvailable:
      body.isAvailable === undefined
        ? existingHotel?.isAvailable !== false
        : convertToBoolean(body.isAvailable),
  };
}

function buildAdminHotelUpdatePayload(body, existingHotel = null) {
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
    payload.location = cleanLocation(body.location);
  }

  if (body.images !== undefined) {
    payload.images = cleanImages(body.images);
  }

  if (body.roomTypes !== undefined) {
    payload.roomTypes = cleanRoomTypes(
      body.roomTypes,
      existingHotel?.roomTypes || []
    );
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

  return payload;
}

/*
|--------------------------------------------------------------------------
| Public hotel functions
|--------------------------------------------------------------------------
*/

// GET /api/hotels
// Public users see only approved and available hotels.
export async function getAllHotels(req, res) {
  try {
    const hotels = await Hotel.find({
      isApproved: true,
      isAvailable: true,
    })
      .populate(
        "ownerId",
        "name email phoneNumber profilePhoto"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: hotels.length,
      hotels,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to retrieve hotels"
    );
  }
}

// GET /api/hotels/:id
// Public users can access only approved and available hotel details.
// The owning hotel owner and admins can view a hotel even while pending.
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
      "name email phoneNumber profilePhoto role"
    );

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    const loggedInUserId = String(
      getLoggedInUserId(req) || ""
    );

    const ownerId = String(
      hotel.ownerId?._id || hotel.ownerId || ""
    );

    const isAdmin = req.user?.role === "admin";
    const isOwner = loggedInUserId && loggedInUserId === ownerId;

    if (
      !isAdmin &&
      !isOwner &&
      (!hotel.isApproved || !hotel.isAvailable)
    ) {
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
    return sendError(
      res,
      error,
      "Failed to retrieve hotel"
    );
  }
}

/*
|--------------------------------------------------------------------------
| Hotel-owner functions
|--------------------------------------------------------------------------
*/

// GET /api/hotels/owner/my
export async function getMyHotels(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to access your hotels",
      });
    }

    const hotels = await Hotel.find({ ownerId })
      .populate(
        "ownerId",
        "name email phoneNumber profilePhoto role"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: hotels.length,
      hotels,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to retrieve your hotels"
    );
  }
}

// POST /api/hotels/owner
export async function createOwnerHotel(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to add a hotel",
      });
    }

    const ownerValidation =
      await validateHotelOwner(ownerId);

    if (!ownerValidation.valid) {
      return res
        .status(ownerValidation.status)
        .json({
          success: false,
          message: ownerValidation.message,
        });
    }

    const hotelPayload =
      buildOwnerHotelPayload(req.body);

    const hotel = await Hotel.create({
      ...hotelPayload,
      ownerId,

      // Hotel owners cannot set their own rating.
      rating: 0,

      // Every new hotel requires admin approval.
      isApproved: false,
    });

    const createdHotel = await Hotel.findById(
      hotel._id
    ).populate(
      "ownerId",
      "name email phoneNumber profilePhoto role"
    );

    return res.status(201).json({
      success: true,
      message:
        "Hotel submitted for administrator approval",
      hotel: createdHotel,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to create hotel",
      400
    );
  }
}

// PUT /api/hotels/owner/:id
export async function updateOwnerHotel(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);
    const { id } = req.params;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to update a hotel",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const hotel = await Hotel.findOne({
      _id: id,
      ownerId,
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message:
          "Hotel was not found or you do not own this hotel",
      });
    }

    const hotelPayload =
      buildOwnerHotelPayload(req.body, hotel);

    hotel.name = hotelPayload.name;
    hotel.description = hotelPayload.description;
    hotel.address = hotelPayload.address;
    hotel.location = hotelPayload.location;
    hotel.images = hotelPayload.images;
    hotel.roomTypes = hotelPayload.roomTypes;
    hotel.contactNumber =
      hotelPayload.contactNumber;
    hotel.isAvailable =
      hotelPayload.isAvailable;

    // Editing an approved hotel sends it for approval again.
    hotel.isApproved = false;

    await hotel.save();

    const updatedHotel = await Hotel.findById(
      hotel._id
    ).populate(
      "ownerId",
      "name email phoneNumber profilePhoto role"
    );

    return res.status(200).json({
      success: true,
      message:
        "Hotel updated and sent for administrator approval",
      hotel: updatedHotel,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to update hotel",
      400
    );
  }
}

// DELETE /api/hotels/owner/:id
export async function deleteOwnerHotel(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);
    const { id } = req.params;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to delete a hotel",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const deletedHotel =
      await Hotel.findOneAndDelete({
        _id: id,
        ownerId,
      });

    if (!deletedHotel) {
      return res.status(404).json({
        success: false,
        message:
          "Hotel was not found or you do not own this hotel",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotel deleted successfully",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to delete hotel"
    );
  }
}


// PATCH /api/hotels/owner/:id/availability
export async function updateOwnerHotelAvailability(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);
    const { id } = req.params;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to update hotel availability",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    if (req.body.isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: "Hotel availability is required",
      });
    }

    const hotel = await Hotel.findOne({
      _id: id,
      ownerId,
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found or you do not own this hotel",
      });
    }

    hotel.isAvailable = convertToBoolean(req.body.isAvailable);

    // Availability changes do not require new admin approval.
    await hotel.save();

    return res.status(200).json({
      success: true,
      message: "Hotel availability updated successfully",
      hotel,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to update hotel availability",
      400
    );
  }
}

// PATCH /api/hotels/owner/:id/rooms/:roomIndex/availability
export async function updateOwnerRoomAvailability(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);
    const { id, roomIndex } = req.params;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to update room availability",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    if (req.body.isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: "Room availability is required",
      });
    }

    const hotel = await Hotel.findOne({
      _id: id,
      ownerId,
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found or you do not own this hotel",
      });
    }

    const parsedRoomIndex = Number(roomIndex);

    if (
      !Number.isInteger(parsedRoomIndex) ||
      parsedRoomIndex < 0 ||
      parsedRoomIndex >= hotel.roomTypes.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid room type index",
      });
    }

    hotel.roomTypes[parsedRoomIndex].isAvailable =
      convertToBoolean(req.body.isAvailable);

    hotel.markModified("roomTypes");
    await hotel.save();

    return res.status(200).json({
      success: true,
      message: "Room availability updated successfully",
      hotel,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to update room availability",
      400
    );
  }
}

// PATCH /api/hotels/owner/:id/rooms/:roomIndex/inventory
export async function updateOwnerRoomInventory(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);
    const { id, roomIndex } = req.params;
    const totalRooms = Number(req.body.totalRooms);

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to update room inventory",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    if (!Number.isInteger(totalRooms) || totalRooms < 1) {
      return res.status(400).json({
        success: false,
        message: "Total rooms must be a whole number of at least 1",
      });
    }

    const hotel = await Hotel.findOne({
      _id: id,
      ownerId,
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found or you do not own this hotel",
      });
    }

    const parsedRoomIndex = Number(roomIndex);

    if (
      !Number.isInteger(parsedRoomIndex) ||
      parsedRoomIndex < 0 ||
      parsedRoomIndex >= hotel.roomTypes.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid room type index",
      });
    }

    hotel.roomTypes[parsedRoomIndex].totalRooms = totalRooms;

    hotel.markModified("roomTypes");
    await hotel.save();

    return res.status(200).json({
      success: true,
      message: "Room inventory updated successfully",
      hotel,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to update room inventory",
      400
    );
  }
}

/*
|--------------------------------------------------------------------------
| Admin functions
|--------------------------------------------------------------------------
*/

// GET /api/hotels/admin/all
export async function getAllHotelsForAdmin(req, res) {
  try {
    const hotels = await Hotel.find()
      .populate(
        "ownerId",
        "name email phoneNumber profilePhoto role isBlocked"
      )
      .sort({
        isApproved: 1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: hotels.length,
      hotels,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to retrieve hotel submissions"
    );
  }
}

// PUT /api/hotels/:id
// Optional admin update route.
export async function updateHotel(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const hotel = await Hotel.findById(id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    const hotelPayload =
      buildAdminHotelUpdatePayload(req.body, hotel);

    if (hotelPayload.ownerId !== undefined) {
      const ownerValidation =
        await validateHotelOwner(
          hotelPayload.ownerId
        );

      if (!ownerValidation.valid) {
        return res
          .status(ownerValidation.status)
          .json({
            success: false,
            message: ownerValidation.message,
          });
      }
    }

    const updatedHotel =
      await Hotel.findByIdAndUpdate(
        id,
        {
          $set: hotelPayload,
        },
        {
          new: true,
          runValidators: true,
          context: "query",
        }
      ).populate(
        "ownerId",
        "name email phoneNumber profilePhoto role"
      );

    return res.status(200).json({
      success: true,
      message: "Hotel updated successfully",
      hotel: updatedHotel,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to update hotel",
      400
    );
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

    const hotel =
      await Hotel.findByIdAndUpdate(
        id,
        {
          $set: {
            isApproved: true,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate(
        "ownerId",
        "name email phoneNumber profilePhoto role"
      );

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
    return sendError(
      res,
      error,
      "Failed to approve hotel",
      400
    );
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

    const hotel =
      await Hotel.findByIdAndUpdate(
        id,
        {
          $set: {
            isApproved: false,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate(
        "ownerId",
        "name email phoneNumber profilePhoto role"
      );

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
    return sendError(
      res,
      error,
      "Failed to reject hotel",
      400
    );
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

    const deletedHotel =
      await Hotel.findByIdAndDelete(id);

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
    return sendError(
      res,
      error,
      "Failed to delete hotel"
    );
  }
}