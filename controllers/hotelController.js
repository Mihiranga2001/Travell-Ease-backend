import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";
import User from "../models/User.js";
import HotelBooking from "../models/HotelBooking.js";
import HotelReview from "../models/HotelReview.js";

const OWNER_POPULATE_FIELDS =
  "name email phoneNumber profilePhoto role isBlocked";

const TRAVELER_POPULATE_FIELDS =
  "name email phoneNumber profilePhoto role";

/*
|--------------------------------------------------------------------------
| Shared helper functions
|--------------------------------------------------------------------------
*/

function getLoggedInUserId(req) {
  return (
    req.user?.userId ||
    req.user?.id ||
    req.user?._id ||
    req.user?.sub ||
    null
  );
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  return new mongoose.Types.ObjectId(value);
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  return fallback;
}

function cleanImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => String(image || "").trim())
    .filter(Boolean);
}

function cleanLocation(location = {}, existingLocation = {}) {
  const latitudeValue =
    location.latitude === undefined
      ? existingLocation.latitude
      : location.latitude;

  const longitudeValue =
    location.longitude === undefined
      ? existingLocation.longitude
      : location.longitude;

  return {
    latitude:
      latitudeValue === "" ||
      latitudeValue === undefined ||
      latitudeValue === null
        ? 0
        : Number(latitudeValue),

    longitude:
      longitudeValue === "" ||
      longitudeValue === undefined ||
      longitudeValue === null
        ? 0
        : Number(longitudeValue),
  };
}

function cleanRoomTypes(roomTypes, existingRoomTypes = []) {
  if (!Array.isArray(roomTypes)) {
    return existingRoomTypes;
  }

  return roomTypes.map((room, index) => {
    const existingRoom = existingRoomTypes[index] || {};

    const totalRooms =
      room?.totalRooms === "" ||
      room?.totalRooms === undefined ||
      room?.totalRooms === null
        ? Number(existingRoom.totalRooms || 1)
        : Number(room.totalRooms);

    return {
      name: String(
        room?.name !== undefined ? room.name : existingRoom.name || ""
      ).trim(),

      pricePerNight: Number(
        room?.pricePerNight !== undefined
          ? room.pricePerNight
          : existingRoom.pricePerNight
      ),

      capacity: Number(
        room?.capacity !== undefined
          ? room.capacity
          : existingRoom.capacity
      ),

      images: Array.isArray(room?.images)
        ? cleanImages(room.images)
        : cleanImages(existingRoom.images),

      totalRooms,

      isAvailable: toBoolean(
        room?.isAvailable,
        existingRoom.isAvailable !== false
      ),
    };
  });
}

function buildOwnerHotelPayload(body, existingHotel = null) {
  const existingLocation = existingHotel?.location || {};
  const existingRoomTypes = existingHotel?.roomTypes || [];

  return {
    name: String(
      body.name !== undefined ? body.name : existingHotel?.name || ""
    ).trim(),

    description: String(
      body.description !== undefined
        ? body.description
        : existingHotel?.description || ""
    ).trim(),

    address: String(
      body.address !== undefined
        ? body.address
        : existingHotel?.address || ""
    ).trim(),

    location:
      body.location !== undefined
        ? cleanLocation(body.location, existingLocation)
        : cleanLocation(existingLocation, existingLocation),

    images:
      body.images !== undefined
        ? cleanImages(body.images)
        : cleanImages(existingHotel?.images),

    roomTypes:
      body.roomTypes !== undefined
        ? cleanRoomTypes(body.roomTypes, existingRoomTypes)
        : existingRoomTypes,

    contactNumber: String(
      body.contactNumber !== undefined
        ? body.contactNumber
        : existingHotel?.contactNumber || ""
    ).trim(),

    isAvailable: toBoolean(
      body.isAvailable,
      existingHotel?.isAvailable !== false
    ),
  };
}

function buildAdminHotelPayload(body, existingHotel) {
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
    payload.location = cleanLocation(
      body.location,
      existingHotel.location || {}
    );
  }

  if (body.images !== undefined) {
    payload.images = cleanImages(body.images);
  }

  if (body.roomTypes !== undefined) {
    payload.roomTypes = cleanRoomTypes(
      body.roomTypes,
      existingHotel.roomTypes || []
    );
  }

  if (body.contactNumber !== undefined) {
    payload.contactNumber = String(body.contactNumber).trim();
  }

  if (body.rating !== undefined) {
    payload.rating = Number(body.rating);
  }

  if (body.isAvailable !== undefined) {
    payload.isAvailable = toBoolean(body.isAvailable);
  }

  return payload;
}

function getValidationMessage(error) {
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

function sendError(res, error, fallbackMessage, defaultStatus = 500) {
  console.error(fallbackMessage, error);

  const isClientError =
    error?.name === "ValidationError" ||
    error?.name === "CastError" ||
    error?.code === 11000;

  return res.status(isClientError ? 400 : defaultStatus).json({
    success: false,
    message: isClientError
      ? getValidationMessage(error)
      : fallbackMessage,
  });
}

async function validateHotelOwner(ownerId) {
  if (!ownerId || !isValidId(ownerId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid hotel owner ID",
    };
  }

  const owner = await User.findById(ownerId).select(
    OWNER_POPULATE_FIELDS
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

function getRoomIndex(roomIndex, hotel) {
  const parsedRoomIndex = Number(roomIndex);

  if (
    !Number.isInteger(parsedRoomIndex) ||
    parsedRoomIndex < 0 ||
    parsedRoomIndex >= hotel.roomTypes.length
  ) {
    return -1;
  }

  return parsedRoomIndex;
}

function hotelModelHasPath(path) {
  return Boolean(Hotel.schema.path(path));
}

function setHotelApprovalState(
  hotel,
  status,
  rejectionReason = ""
) {
  hotel.isApproved = status === "approved";

  if (hotelModelHasPath("approvalStatus")) {
    hotel.approvalStatus = status;
  }

  if (hotelModelHasPath("rejectionReason")) {
    hotel.rejectionReason =
      status === "rejected"
        ? String(rejectionReason || "").trim()
        : "";
  }
}

function getHotelApprovalStatus(hotel) {
  if (hotel?.approvalStatus) {
    return hotel.approvalStatus;
  }

  return hotel?.isApproved === true ? "approved" : "pending";
}

function getApprovedHotelQuery() {
  if (hotelModelHasPath("approvalStatus")) {
    return {
      $or: [
        { approvalStatus: "approved" },
        { isApproved: true },
      ],
    };
  }

  return {
    isApproved: true,
  };
}

async function deleteHotelRelatedData(hotelId) {
  await Promise.all([
    HotelBooking.deleteMany({ hotelId }),
    HotelReview.deleteMany({ hotelId }),
  ]);
}

/*
|--------------------------------------------------------------------------
| Public hotel functions
|--------------------------------------------------------------------------
*/

// GET /api/hotels
export async function getAllHotels(req, res) {
  try {
    const hotels = await Hotel.find({
      isAvailable: true,
      ...getApprovedHotelQuery(),
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
      OWNER_POPULATE_FIELDS
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

    const hotelOwnerId = String(
      hotel.ownerId?._id || hotel.ownerId || ""
    );

    const isAdmin =
      req.user?.role === "admin" ||
      req.user?.userType === "admin" ||
      req.user?.isAdmin === true;

    const isOwner =
      loggedInUserId && loggedInUserId === hotelOwnerId;

    const isPubliclyVisible =
      getHotelApprovalStatus(hotel) === "approved" &&
      hotel.isAvailable !== false;

    if (!isAdmin && !isOwner && !isPubliclyVisible) {
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

    const hotels = await Hotel.find({ ownerId })
      .populate("ownerId", OWNER_POPULATE_FIELDS)
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
    const ownerValidation = await validateHotelOwner(ownerId);

    if (!ownerValidation.valid) {
      return res.status(ownerValidation.status).json({
        success: false,
        message: ownerValidation.message,
      });
    }

    const payload = buildOwnerHotelPayload(req.body);

    const hotel = new Hotel({
      ...payload,
      ownerId,
      rating: 0,
      isApproved: false,
    });

    if (hotelModelHasPath("reviewCount")) {
      hotel.reviewCount = 0;
    }

    setHotelApprovalState(hotel, "pending");

    await hotel.save();
    await hotel.populate("ownerId", OWNER_POPULATE_FIELDS);

    return res.status(201).json({
      success: true,
      message:
        "Hotel submitted for administrator approval",
      hotel,
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

    const payload = buildOwnerHotelPayload(req.body, hotel);

    Object.assign(hotel, payload);
    setHotelApprovalState(hotel, "pending");

    await hotel.save();
    await hotel.populate("ownerId", OWNER_POPULATE_FIELDS);

    return res.status(200).json({
      success: true,
      message:
        "Hotel updated and sent for administrator approval",
      hotel,
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

    await deleteHotelRelatedData(hotel._id);
    await hotel.deleteOne();

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

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    if (req.body.isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: "isAvailable is required",
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

    hotel.isAvailable = toBoolean(
      req.body.isAvailable,
      hotel.isAvailable !== false
    );

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

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    if (req.body.isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: "isAvailable is required",
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

    const parsedRoomIndex = getRoomIndex(roomIndex, hotel);

    if (parsedRoomIndex < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid room type index",
      });
    }

    hotel.roomTypes[parsedRoomIndex].isAvailable =
      toBoolean(
        req.body.isAvailable,
        hotel.roomTypes[parsedRoomIndex].isAvailable !== false
      );

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

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    if (!Number.isInteger(totalRooms) || totalRooms < 1) {
      return res.status(400).json({
        success: false,
        message:
          "Total rooms must be a whole number of at least 1",
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

    const parsedRoomIndex = getRoomIndex(roomIndex, hotel);

    if (parsedRoomIndex < 0) {
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
| Administrator hotel functions
|--------------------------------------------------------------------------
*/

// GET /api/hotels/admin/all
export async function getAllHotelsForAdmin(req, res) {
  try {
    const hotels = await Hotel.find()
      .populate("ownerId", OWNER_POPULATE_FIELDS)
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
      "Failed to retrieve hotel submissions"
    );
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

    const hotel = await Hotel.findById(id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    const payload = buildAdminHotelPayload(req.body, hotel);

    if (payload.ownerId !== undefined) {
      const ownerValidation = await validateHotelOwner(
        payload.ownerId
      );

      if (!ownerValidation.valid) {
        return res.status(ownerValidation.status).json({
          success: false,
          message: ownerValidation.message,
        });
      }
    }

    Object.assign(hotel, payload);

    if (
      req.body.approvalStatus !== undefined ||
      req.body.isApproved !== undefined
    ) {
      const requestedStatus =
        req.body.approvalStatus !== undefined
          ? String(req.body.approvalStatus).toLowerCase()
          : toBoolean(req.body.isApproved)
            ? "approved"
            : "pending";

      if (
        !["pending", "approved", "rejected"].includes(
          requestedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Approval status must be pending, approved, or rejected",
        });
      }

      setHotelApprovalState(
        hotel,
        requestedStatus,
        req.body.rejectionReason || req.body.reason || ""
      );
    }

    await hotel.save();
    await hotel.populate("ownerId", OWNER_POPULATE_FIELDS);

    return res.status(200).json({
      success: true,
      message: "Hotel updated successfully",
      hotel,
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

    const hotel = await Hotel.findById(id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    setHotelApprovalState(hotel, "approved");

    await hotel.save();
    await hotel.populate("ownerId", OWNER_POPULATE_FIELDS);

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

    const hotel = await Hotel.findById(id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    setHotelApprovalState(
      hotel,
      "rejected",
      req.body.reason || req.body.rejectionReason || ""
    );

    await hotel.save();
    await hotel.populate("ownerId", OWNER_POPULATE_FIELDS);

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

    const hotel = await Hotel.findById(id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    await deleteHotelRelatedData(hotel._id);
    await hotel.deleteOne();

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

/*
|--------------------------------------------------------------------------
| Hotel booking helper functions
|--------------------------------------------------------------------------
*/

function getNights(checkInDate, checkOutDate) {
  const milliseconds =
    checkOutDate.getTime() - checkInDate.getTime();

  return Math.ceil(
    milliseconds / (1000 * 60 * 60 * 24)
  );
}

async function getOwnedHotelIds(ownerId) {
  const hotels = await Hotel.find({ ownerId })
    .select("_id")
    .lean();

  return hotels.map((hotel) => hotel._id);
}

async function getReservedRoomCount({
  hotelId,
  roomTypeIndex,
  checkInDate,
  checkOutDate,
  excludeBookingId,
}) {
  const query = {
    hotelId: toObjectId(hotelId),
    roomTypeIndex: Number(roomTypeIndex),
    status: "approved",
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  };

  if (excludeBookingId) {
    query._id = {
      $ne: toObjectId(excludeBookingId),
    };
  }

  const result = await HotelBooking.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: "$numberOfRooms" },
      },
    },
  ]);

  return Number(result[0]?.total || 0);
}

/*
|--------------------------------------------------------------------------
| Traveler and hotel-owner booking functions
|--------------------------------------------------------------------------
*/

// POST /api/bookings
export async function createHotelBooking(req, res) {
  try {
    const travelerId = getLoggedInUserId(req);

    const {
      hotelId,
      roomTypeIndex,
      checkInDate,
      checkOutDate,
      numberOfRooms = 1,
      guests = 1,
      specialRequests = "",
    } = req.body;

    if (!travelerId || !isValidId(travelerId)) {
      return res.status(401).json({
        success: false,
        message: "Please log in to create a booking",
      });
    }

    if (!isValidId(hotelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const parsedRoomTypeIndex = Number(roomTypeIndex);
    const parsedNumberOfRooms = Number(numberOfRooms);
    const parsedGuests = Number(guests);
    const parsedCheckInDate = new Date(checkInDate);
    const parsedCheckOutDate = new Date(checkOutDate);

    if (
      !Number.isInteger(parsedRoomTypeIndex) ||
      parsedRoomTypeIndex < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid room type",
      });
    }

    if (
      !Number.isInteger(parsedNumberOfRooms) ||
      parsedNumberOfRooms < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Number of rooms must be a whole number of at least 1",
      });
    }

    if (
      !Number.isInteger(parsedGuests) ||
      parsedGuests < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Guest count must be a whole number of at least 1",
      });
    }

    if (
      Number.isNaN(parsedCheckInDate.getTime()) ||
      Number.isNaN(parsedCheckOutDate.getTime()) ||
      parsedCheckOutDate <= parsedCheckInDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Check-out date must be after check-in date",
      });
    }

    const hotel = await Hotel.findById(hotelId);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel was not found",
      });
    }

    if (
      getHotelApprovalStatus(hotel) !== "approved" ||
      hotel.isAvailable === false
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This hotel is not currently available for booking",
      });
    }

    const room = hotel.roomTypes[parsedRoomTypeIndex];

    if (!room || room.isAvailable === false) {
      return res.status(400).json({
        success: false,
        message:
          "The selected room type is not available",
      });
    }

    if (
      parsedGuests >
      Number(room.capacity) * parsedNumberOfRooms
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Guest count exceeds the selected room capacity",
      });
    }

    const totalRoomInventory = Number(room.totalRooms || 1);

    const reservedRooms = await getReservedRoomCount({
      hotelId: hotel._id,
      roomTypeIndex: parsedRoomTypeIndex,
      checkInDate: parsedCheckInDate,
      checkOutDate: parsedCheckOutDate,
    });

    const availableRooms = Math.max(
      totalRoomInventory - reservedRooms,
      0
    );

    if (parsedNumberOfRooms > availableRooms) {
      return res.status(409).json({
        success: false,
        message: `Only ${availableRooms} room(s) are available for the selected dates`,
      });
    }

    const totalNights = getNights(
      parsedCheckInDate,
      parsedCheckOutDate
    );

    const totalPrice =
      totalNights *
      Number(room.pricePerNight) *
      parsedNumberOfRooms;

    const booking = await HotelBooking.create({
      travelerId,
      hotelId,
      roomTypeIndex: parsedRoomTypeIndex,
      roomTypeName: room.name,
      checkInDate: parsedCheckInDate,
      checkOutDate: parsedCheckOutDate,
      numberOfRooms: parsedNumberOfRooms,
      guests: parsedGuests,
      pricePerNight: room.pricePerNight,
      totalNights,
      totalPrice,
      specialRequests: String(
        specialRequests || ""
      ).trim(),
      status: "pending",
    });

    await booking.populate([
      {
        path: "travelerId",
        select: TRAVELER_POPULATE_FIELDS,
      },
      {
        path: "hotelId",
        select: "name address images ownerId roomTypes",
      },
    ]);

    return res.status(201).json({
      success: true,
      message: "Booking request submitted successfully",
      booking,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to create hotel booking",
      400
    );
  }
}

// GET /api/bookings/my
export async function getMyHotelBookings(req, res) {
  try {
    const travelerId = getLoggedInUserId(req);

    const bookings = await HotelBooking.find({ travelerId })
      .populate(
        "hotelId",
        "name address images ownerId roomTypes"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to retrieve your bookings"
    );
  }
}

// GET /api/bookings/owner/my
export async function getOwnerHotelBookings(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);
    const hotelIds = await getOwnedHotelIds(ownerId);

    if (hotelIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        bookings: [],
      });
    }

    const bookings = await HotelBooking.find({
      hotelId: { $in: hotelIds },
    })
      .populate(
        "travelerId",
        TRAVELER_POPULATE_FIELDS
      )
      .populate(
        "hotelId",
        "name address images ownerId roomTypes"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to retrieve hotel bookings"
    );
  }
}

// PATCH /api/bookings/owner/:id/status
export async function updateOwnerBookingStatus(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);
    const { id } = req.params;
    const status = String(req.body.status || "")
      .trim()
      .toLowerCase();
    const ownerMessage = String(
      req.body.ownerMessage || ""
    ).trim();

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    if (
      !["approved", "rejected", "completed"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be approved, rejected, or completed",
      });
    }

    const booking = await HotelBooking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking was not found",
      });
    }

    const hotel = await Hotel.findOne({
      _id: booking.hotelId,
      ownerId,
    });

    if (!hotel) {
      return res.status(403).json({
        success: false,
        message: "You cannot manage this booking",
      });
    }

    if (["cancelled", "completed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `A ${booking.status} booking cannot be changed`,
      });
    }

    if (
      status === "completed" &&
      booking.status !== "approved"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only an approved booking can be marked as completed",
      });
    }

    if (status === "approved") {
      const room = hotel.roomTypes[booking.roomTypeIndex];

      if (
        !room ||
        room.isAvailable === false ||
        hotel.isAvailable === false
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The selected hotel or room type is unavailable",
        });
      }

      const reservedRooms = await getReservedRoomCount({
        hotelId: booking.hotelId,
        roomTypeIndex: booking.roomTypeIndex,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        excludeBookingId: booking._id,
      });

      if (
        reservedRooms + booking.numberOfRooms >
        Number(room.totalRooms || 1)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Not enough rooms are available for these dates. Reject this request or increase the room inventory",
        });
      }
    }

    booking.status = status;
    booking.ownerMessage = ownerMessage;
    await booking.save();

    await booking.populate([
      {
        path: "travelerId",
        select: TRAVELER_POPULATE_FIELDS,
      },
      {
        path: "hotelId",
        select: "name address images ownerId roomTypes",
      },
    ]);

    return res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      booking,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to update booking status"
    );
  }
}

// PATCH /api/bookings/:id/cancel
export async function cancelMyHotelBooking(req, res) {
  try {
    const travelerId = getLoggedInUserId(req);
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await HotelBooking.findOne({
      _id: id,
      travelerId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking was not found",
      });
    }

    if (
      ["cancelled", "completed", "rejected"].includes(
        booking.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `A ${booking.status} booking cannot be cancelled`,
      });
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to cancel booking"
    );
  }
}

/*
|--------------------------------------------------------------------------
| Hotel review helper functions
|--------------------------------------------------------------------------
*/

async function refreshHotelRating(hotelId) {
  const result = await HotelReview.aggregate([
    {
      $match: {
        hotelId: toObjectId(hotelId),
        isVisible: true,
      },
    },
    {
      $group: {
        _id: "$hotelId",
        rating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const summary = result[0] || {
    rating: 0,
    reviewCount: 0,
  };

  const update = {
    rating: Number(summary.rating || 0),
  };

  if (hotelModelHasPath("reviewCount")) {
    update.reviewCount = Number(summary.reviewCount || 0);
  }

  await Hotel.findByIdAndUpdate(hotelId, update, {
    runValidators: true,
  });
}

/*
|--------------------------------------------------------------------------
| Public, traveler, and hotel-owner review functions
|--------------------------------------------------------------------------
*/

// GET /api/reviews/hotel/:hotelId
export async function getPublicHotelReviews(req, res) {
  try {
    const { hotelId } = req.params;

    if (!isValidId(hotelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }

    const reviews = await HotelReview.find({
      hotelId,
      isVisible: true,
    })
      .populate(
        "travelerId",
        "name profilePhoto"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to retrieve hotel reviews"
    );
  }
}

// POST /api/reviews
export async function createHotelReview(req, res) {
  try {
    const travelerId = getLoggedInUserId(req);
    const { bookingId, rating, comment = "" } = req.body;

    if (!isValidId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const parsedRating = Number(rating);

    if (
      !Number.isInteger(parsedRating) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rating must be a whole number between 1 and 5",
      });
    }

    const booking = await HotelBooking.findOne({
      _id: bookingId,
      travelerId,
      status: { $in: ["approved", "completed"] },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "An eligible booking was not found",
      });
    }

    const review = await HotelReview.create({
      hotelId: booking.hotelId,
      travelerId,
      bookingId,
      rating: parsedRating,
      comment: String(comment || "").trim(),
    });

    await refreshHotelRating(booking.hotelId);
    await review.populate(
      "travelerId",
      "name profilePhoto"
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    const duplicate = error?.code === 11000;

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "A review has already been submitted for this booking",
      });
    }

    return sendError(
      res,
      error,
      "Failed to submit review",
      400
    );
  }
}

// GET /api/reviews/owner/my
export async function getOwnerHotelReviews(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);

    const hotels = await Hotel.find({ ownerId })
      .select("_id")
      .lean();

    const hotelIds = hotels.map((hotel) => hotel._id);

    const reviews = hotelIds.length
      ? await HotelReview.find({
          hotelId: { $in: hotelIds },
        })
          .populate(
            "travelerId",
            "name email profilePhoto"
          )
          .populate(
            "hotelId",
            "name images rating reviewCount"
          )
          .sort({ createdAt: -1 })
      : [];

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to retrieve hotel reviews"
    );
  }
}

// PATCH /api/reviews/owner/:id/reply
export async function replyToHotelReview(req, res) {
  try {
    const ownerId = getLoggedInUserId(req);
    const { id } = req.params;
    const ownerReply = String(
      req.body.ownerReply || ""
    ).trim();

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    if (ownerReply.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot exceed 2000 characters",
      });
    }

    const review = await HotelReview.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review was not found",
      });
    }

    const ownsHotel = await Hotel.exists({
      _id: review.hotelId,
      ownerId,
    });

    if (!ownsHotel) {
      return res.status(403).json({
        success: false,
        message: "You cannot reply to this review",
      });
    }

    review.ownerReply = ownerReply;
    await review.save();

    await review.populate([
      {
        path: "travelerId",
        select: "name email profilePhoto",
      },
      {
        path: "hotelId",
        select: "name images rating reviewCount",
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Review reply saved successfully",
      review,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to save review reply"
    );
  }
}
