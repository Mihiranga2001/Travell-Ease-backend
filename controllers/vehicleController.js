import mongoose from "mongoose";
import Vehicle from "../models/vehicle.js";
import VehicleBooking from "../models/VehicleBooking.js";
import VehicleReview from "../models/VehicleReview.js";

const VEHICLE_TYPES = ["bike", "tuk", "car", "van", "bus"];
const COMPANY_FIELDS =
  "name companyName email phoneNumber profilePhoto role isBlocked";
const TRAVELER_FIELDS = "name email phoneNumber profilePhoto role";

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isVehicleCompanyRole(role) {
  const normalized = normalizeRole(role);
  return normalized === "vehicle_company" || normalized === "vehicle_comapny";
}

function isAdminRole(role) {
  return normalizeRole(role) === "admin";
}

function getLoggedInUserId(req) {
  const value =
    req.user?.userId ||
    req.user?.id ||
    req.user?._id ||
    req.user?.companyId ||
    null;

  if (value && typeof value === "object") {
    return value._id || value.id || null;
  }

  return value;
}

function isValidId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return value === true || value === "true" || value === 1 || value === "1";
}

function requireCompanyContext(req, res) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication is required",
    });
    return null;
  }

  if (!isVehicleCompanyRole(req.user.role || req.user.userType)) {
    res.status(403).json({
      success: false,
      message: "Only vehicle-company accounts can access this resource",
    });
    return null;
  }

  const companyId = getLoggedInUserId(req);

  if (!companyId || !isValidId(companyId)) {
    res.status(400).json({
      success: false,
      message:
        "A valid logged-in vehicle-company user ID is missing from the authentication token",
    });
    return null;
  }

  return { companyId: String(companyId) };
}

function requireAdminContext(req, res) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication is required",
    });
    return false;
  }

  if (!isAdminRole(req.user.role || req.user.userType) && req.user.isAdmin !== true) {
    res.status(403).json({
      success: false,
      message: "Administrator access is required",
    });
    return false;
  }

  return true;
}

function cleanLocation(location = {}) {
  return {
    latitude:
      location.latitude === "" ||
      location.latitude === undefined ||
      location.latitude === null
        ? 0
        : Number(location.latitude),
    longitude:
      location.longitude === "" ||
      location.longitude === undefined ||
      location.longitude === null
        ? 0
        : Number(location.longitude),
  };
}

function buildVehiclePayload(body, { partial = false } = {}) {
  const payload = {};

  if (!partial || body.type !== undefined) {
    payload.type = String(body.type || "").trim().toLowerCase();
  }
  if (!partial || body.model !== undefined) {
    payload.model = String(body.model || "").trim();
  }
  if (!partial || body.image !== undefined) {
    payload.image = String(body.image || "").trim();
  }
  if (!partial || body.pricePerDay !== undefined) {
    payload.pricePerDay = Number(body.pricePerDay);
  }
  if (!partial || body.seats !== undefined) {
    payload.seats = Number(body.seats);
  }
  if (!partial || body.location !== undefined) {
    payload.location = cleanLocation(body.location);
  }

  return payload;
}

function validateVehiclePayload(payload, { partial = false } = {}) {
  if ((!partial || payload.type !== undefined) && !VEHICLE_TYPES.includes(payload.type)) {
    return "Vehicle type must be bike, tuk, car, van or bus";
  }

  if (!partial || payload.model !== undefined) {
    if (typeof payload.model !== "string" || payload.model.length < 2) {
      return "Vehicle model must contain at least 2 characters";
    }
    if (payload.model.length > 150) {
      return "Vehicle model cannot exceed 150 characters";
    }
  }

  if (!partial || payload.pricePerDay !== undefined) {
    if (!Number.isFinite(payload.pricePerDay) || payload.pricePerDay < 0) {
      return "Price per day must be a valid non-negative number";
    }
  }

  if (!partial || payload.seats !== undefined) {
    if (!Number.isInteger(payload.seats) || payload.seats < 1) {
      return "Seats must be a whole number of at least 1";
    }
  }

  if (!partial || payload.location !== undefined) {
    const latitude = Number(payload.location?.latitude);
    const longitude = Number(payload.location?.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return "Latitude must be between -90 and 90";
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return "Longitude must be between -180 and 180";
    }
  }

  return "";
}

function getApprovalStatus(vehicle) {
  if (vehicle?.approvalStatus) {
    return vehicle.approvalStatus;
  }
  return vehicle?.isApproved === true ? "approved" : "pending";
}

function getValidationMessage(error) {
  if (error?.name === "ValidationError") {
    return Object.values(error.errors)
      .map((item) => item.message)
      .join(", ");
  }
  if (error?.name === "CastError") {
    return "Invalid database identifier";
  }
  if (error?.code === 11000) {
    return "Duplicate data already exists";
  }
  return error?.message || "Something went wrong";
}

function sendError(res, error, fallbackMessage, defaultStatus = 500) {
  console.error(fallbackMessage, error);
  const clientError =
    error?.name === "ValidationError" ||
    error?.name === "CastError" ||
    error?.code === 11000;

  return res.status(clientError ? 400 : defaultStatus).json({
    success: false,
    message: clientError ? getValidationMessage(error) : fallbackMessage,
  });
}

function calculateRentalDays(startDate, endDate) {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
}

async function hasApprovedBookingOverlap({
  vehicleId,
  startDate,
  endDate,
  excludeBookingId,
}) {
  const query = {
    vehicleId,
    status: "approved",
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Boolean(await VehicleBooking.exists(query));
}

async function refreshVehicleRating(vehicleId) {
  const result = await VehicleReview.aggregate([
    {
      $match: {
        vehicleId: new mongoose.Types.ObjectId(vehicleId),
        isVisible: true,
      },
    },
    {
      $group: {
        _id: "$vehicleId",
        rating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const summary = result[0] || { rating: 0, reviewCount: 0 };

  await Vehicle.findByIdAndUpdate(vehicleId, {
    rating: Number(summary.rating || 0),
    reviewCount: Number(summary.reviewCount || 0),
  });
}

/* -------------------------------------------------------------------------- */
/* Vehicle public routes                                                       */
/* -------------------------------------------------------------------------- */

export async function getVehicles(req, res) {
  try {
    const filter = {
      $or: [{ approvalStatus: "approved" }, { isApproved: true }],
    };

    if (req.query.type) {
      const type = String(req.query.type).trim().toLowerCase();
      if (!VEHICLE_TYPES.includes(type)) {
        return res.status(400).json({ success: false, message: "Invalid vehicle type" });
      }
      filter.type = type;
    }

    if (req.query.companyId) {
      if (!isValidId(req.query.companyId)) {
        return res.status(400).json({ success: false, message: "Invalid company ID" });
      }
      filter.companyId = req.query.companyId;
    }

    if (req.query.isAvailable !== undefined) {
      const value = String(req.query.isAvailable).toLowerCase();
      if (!["true", "false"].includes(value)) {
        return res.status(400).json({
          success: false,
          message: "isAvailable must be true or false",
        });
      }
      filter.isAvailable = value === "true";
    }

    const vehicles = await Vehicle.find(filter)
      .populate("companyId", COMPANY_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: vehicles.length, vehicles });
  } catch (error) {
    return sendError(res, error, "Failed to load vehicles");
  }
}

export async function getVehicleById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }

    const vehicle = await Vehicle.findById(id).populate("companyId", COMPANY_FIELDS);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    const loggedInId = String(getLoggedInUserId(req) || "");
    const companyId = String(vehicle.companyId?._id || vehicle.companyId || "");
    const isAdmin = isAdminRole(req.user?.role || req.user?.userType) || req.user?.isAdmin === true;
    const isOwner = loggedInId && loggedInId === companyId;
    const isPublic = getApprovalStatus(vehicle) === "approved";

    if (!isAdmin && !isOwner && !isPublic) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    return res.status(200).json({ success: true, vehicle });
  } catch (error) {
    return sendError(res, error, "Failed to load vehicle");
  }
}

/* -------------------------------------------------------------------------- */
/* Vehicle company routes                                                      */
/* -------------------------------------------------------------------------- */

export async function getMyCompanyVehicles(req, res) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const vehicles = await Vehicle.find({ companyId: context.companyId })
      .populate("companyId", COMPANY_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: vehicles.length, vehicles });
  } catch (error) {
    return sendError(res, error, "Failed to load company vehicles");
  }
}

export async function createCompanyVehicle(req, res) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const payload = buildVehiclePayload(req.body);
    const validationMessage = validateVehiclePayload(payload);

    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const vehicle = await Vehicle.create({
      ...payload,
      companyId: context.companyId,
      isAvailable: true,
      isApproved: false,
      approvalStatus: "pending",
      rejectionReason: "",
    });

    await vehicle.populate("companyId", COMPANY_FIELDS);

    return res.status(201).json({
      success: true,
      message: "Vehicle created and sent for administrator approval",
      vehicle,
    });
  } catch (error) {
    return sendError(res, error, "Failed to create vehicle", 400);
  }
}

export async function updateCompanyVehicle(req, res) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }

    const vehicle = await Vehicle.findOne({ _id: id, companyId: context.companyId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found or it does not belong to your company",
      });
    }

    const payload = buildVehiclePayload(req.body, { partial: true });
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: "No vehicle fields were provided" });
    }

    const validationMessage = validateVehiclePayload(payload, { partial: true });
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    Object.assign(vehicle, payload, {
      isApproved: false,
      approvalStatus: "pending",
      rejectionReason: "",
    });

    await vehicle.save();
    await vehicle.populate("companyId", COMPANY_FIELDS);

    return res.status(200).json({
      success: true,
      message: "Vehicle updated and returned to pending approval",
      vehicle,
    });
  } catch (error) {
    return sendError(res, error, "Failed to update vehicle", 400);
  }
}

export async function deleteCompanyVehicle(req, res) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }

    const activeBooking = await VehicleBooking.exists({
      vehicleId: id,
      status: { $in: ["pending", "approved"] },
    });

    if (activeBooking) {
      return res.status(409).json({
        success: false,
        message: "This vehicle has an active booking and cannot be deleted",
      });
    }

    const vehicle = await Vehicle.findOneAndDelete({
      _id: id,
      companyId: context.companyId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found or it does not belong to your company",
      });
    }

    return res.status(200).json({ success: true, message: "Vehicle deleted successfully" });
  } catch (error) {
    return sendError(res, error, "Failed to delete vehicle");
  }
}

export async function updateCompanyVehicleAvailability(req, res) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }
    if (req.body.isAvailable === undefined) {
      return res.status(400).json({ success: false, message: "isAvailable is required" });
    }

    const vehicle = await Vehicle.findOne({ _id: id, companyId: context.companyId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found or it does not belong to your company",
      });
    }

    vehicle.isAvailable = toBoolean(req.body.isAvailable);
    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle availability updated successfully",
      vehicle,
    });
  } catch (error) {
    return sendError(res, error, "Failed to update vehicle availability", 400);
  }
}

/* -------------------------------------------------------------------------- */
/* Vehicle administrator routes                                                */
/* -------------------------------------------------------------------------- */

export async function getAllVehiclesForAdmin(req, res) {
  try {
    if (!requireAdminContext(req, res)) return;

    const vehicles = await Vehicle.find()
      .populate("companyId", COMPANY_FIELDS)
      .sort({ approvalStatus: 1, createdAt: -1 });

    return res.status(200).json({ success: true, count: vehicles.length, vehicles });
  } catch (error) {
    return sendError(res, error, "Failed to load admin vehicles");
  }
}

export async function approveVehicle(req, res) {
  try {
    if (!requireAdminContext(req, res)) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    vehicle.isApproved = true;
    vehicle.approvalStatus = "approved";
    vehicle.rejectionReason = "";
    await vehicle.save();
    await vehicle.populate("companyId", COMPANY_FIELDS);

    return res.status(200).json({
      success: true,
      message: "Vehicle approved successfully",
      vehicle,
    });
  } catch (error) {
    return sendError(res, error, "Failed to approve vehicle", 400);
  }
}

export async function rejectVehicle(req, res) {
  try {
    if (!requireAdminContext(req, res)) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    vehicle.isApproved = false;
    vehicle.approvalStatus = "rejected";
    vehicle.rejectionReason = String(req.body.reason || "").trim();
    await vehicle.save();
    await vehicle.populate("companyId", COMPANY_FIELDS);

    return res.status(200).json({
      success: true,
      message: "Vehicle rejected successfully",
      vehicle,
    });
  } catch (error) {
    return sendError(res, error, "Failed to reject vehicle", 400);
  }
}

export async function updateVehicleAvailability(req, res) {
  try {
    if (!requireAdminContext(req, res)) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }
    if (req.body.isAvailable === undefined) {
      return res.status(400).json({ success: false, message: "isAvailable is required" });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    vehicle.isAvailable = toBoolean(req.body.isAvailable);
    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle availability updated successfully",
      vehicle,
    });
  } catch (error) {
    return sendError(res, error, "Failed to update vehicle availability", 400);
  }
}

export async function updateVehicle(req, res) {
  try {
    if (!requireAdminContext(req, res)) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    const payload = buildVehiclePayload(req.body, { partial: true });
    const validationMessage = validateVehiclePayload(payload, { partial: true });
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    Object.assign(vehicle, payload);

    if (req.body.companyId !== undefined) {
      if (!isValidId(req.body.companyId)) {
        return res.status(400).json({ success: false, message: "Invalid company ID" });
      }
      vehicle.companyId = req.body.companyId;
    }
    if (req.body.isAvailable !== undefined) {
      vehicle.isAvailable = toBoolean(req.body.isAvailable);
    }
    if (req.body.approvalStatus !== undefined) {
      const status = String(req.body.approvalStatus).toLowerCase();
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid approval status" });
      }
      vehicle.approvalStatus = status;
      vehicle.isApproved = status === "approved";
    } else if (req.body.isApproved !== undefined) {
      vehicle.isApproved = toBoolean(req.body.isApproved);
      vehicle.approvalStatus = vehicle.isApproved ? "approved" : "pending";
    }

    await vehicle.save();
    await vehicle.populate("companyId", COMPANY_FIELDS);

    return res.status(200).json({ success: true, message: "Vehicle updated successfully", vehicle });
  } catch (error) {
    return sendError(res, error, "Failed to update vehicle", 400);
  }
}

export async function deleteVehicle(req, res) {
  try {
    if (!requireAdminContext(req, res)) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }

    const vehicle = await Vehicle.findByIdAndDelete(id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    await VehicleBooking.deleteMany({ vehicleId: id });
    await VehicleReview.deleteMany({ vehicleId: id });

    return res.status(200).json({ success: true, message: "Vehicle deleted successfully" });
  } catch (error) {
    return sendError(res, error, "Failed to delete vehicle");
  }
}

export const createVehicle = createCompanyVehicle;

/* -------------------------------------------------------------------------- */
/* Vehicle booking routes                                                      */
/* -------------------------------------------------------------------------- */

export async function createVehicleBooking(req, res) {
  try {
    const travelerId = getLoggedInUserId(req);
    const {
      vehicleId,
      startDate,
      endDate,
      passengers = 1,
      pickupLocation = "",
      dropoffLocation = "",
      specialRequests = "",
    } = req.body;

    if (!travelerId || !isValidId(travelerId)) {
      return res.status(401).json({ success: false, message: "Please log in to book a vehicle" });
    }
    if (!isValidId(vehicleId)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    const parsedPassengers = Number(passengers);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime()) ||
      parsedEndDate <= parsedStartDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Rental end date must be after the start date",
      });
    }
    if (!Number.isInteger(parsedPassengers) || parsedPassengers < 1) {
      return res.status(400).json({
        success: false,
        message: "Passengers must be a whole number of at least 1",
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }
    if (getApprovalStatus(vehicle) !== "approved" || vehicle.isAvailable === false) {
      return res.status(400).json({
        success: false,
        message: "This vehicle is not currently available for booking",
      });
    }
    if (parsedPassengers > vehicle.seats) {
      return res.status(400).json({
        success: false,
        message: "Passenger count exceeds the vehicle seating capacity",
      });
    }
    if (String(vehicle.companyId) === String(travelerId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own company vehicle",
      });
    }

    const overlap = await hasApprovedBookingOverlap({
      vehicleId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        message: "This vehicle is already booked for the selected dates",
      });
    }

    const totalDays = calculateRentalDays(parsedStartDate, parsedEndDate);
    const totalPrice = totalDays * Number(vehicle.pricePerDay);

    const booking = await VehicleBooking.create({
      travelerId,
      vehicleId,
      companyId: vehicle.companyId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      totalDays,
      passengers: parsedPassengers,
      pricePerDay: vehicle.pricePerDay,
      totalPrice,
      pickupLocation: String(pickupLocation || "").trim(),
      dropoffLocation: String(dropoffLocation || "").trim(),
      specialRequests: String(specialRequests || "").trim(),
      status: "pending",
    });

    await booking.populate([
      { path: "travelerId", select: TRAVELER_FIELDS },
      { path: "vehicleId", select: "type model image seats pricePerDay location isAvailable isApproved approvalStatus" },
      { path: "companyId", select: COMPANY_FIELDS },
    ]);

    return res.status(201).json({
      success: true,
      message: "Vehicle booking request submitted successfully",
      booking,
    });
  } catch (error) {
    return sendError(res, error, "Failed to create vehicle booking", 400);
  }
}

export async function getMyVehicleBookings(req, res) {
  try {
    const travelerId = getLoggedInUserId(req);
    if (!travelerId || !isValidId(travelerId)) {
      return res.status(401).json({ success: false, message: "Please log in" });
    }

    const bookings = await VehicleBooking.find({ travelerId })
      .populate("vehicleId", "type model image seats pricePerDay location")
      .populate("companyId", COMPANY_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    return sendError(res, error, "Failed to retrieve your vehicle bookings");
  }
}

export async function getCompanyVehicleBookings(req, res) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const bookings = await VehicleBooking.find({ companyId: context.companyId })
      .populate("travelerId", TRAVELER_FIELDS)
      .populate("vehicleId", "type model image seats pricePerDay location isAvailable isApproved approvalStatus")
      .populate("companyId", COMPANY_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    return sendError(res, error, "Failed to retrieve company vehicle bookings");
  }
}

export async function updateCompanyBookingStatus(req, res) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { id } = req.params;
    const status = String(req.body.status || "").trim().toLowerCase();
    const companyMessage = String(req.body.companyMessage || "").trim();

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }
    if (!["approved", "rejected", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved, rejected or completed",
      });
    }

    const booking = await VehicleBooking.findOne({ _id: id, companyId: context.companyId });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or it does not belong to your company",
      });
    }

    if (["cancelled", "completed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `A ${booking.status} booking cannot be changed`,
      });
    }

    if (status === "approved") {
      const vehicle = await Vehicle.findOne({
        _id: booking.vehicleId,
        companyId: context.companyId,
      });

      if (!vehicle || getApprovalStatus(vehicle) !== "approved" || vehicle.isAvailable === false) {
        return res.status(400).json({
          success: false,
          message: "The selected vehicle is unavailable or not approved",
        });
      }

      const overlap = await hasApprovedBookingOverlap({
        vehicleId: booking.vehicleId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        excludeBookingId: booking._id,
      });

      if (overlap) {
        return res.status(409).json({
          success: false,
          message: "This vehicle already has an approved booking for these dates",
        });
      }
    }

    if (status === "completed" && booking.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only an approved booking can be marked as completed",
      });
    }

    booking.status = status;
    booking.companyMessage = companyMessage;
    await booking.save();

    await booking.populate([
      { path: "travelerId", select: TRAVELER_FIELDS },
      { path: "vehicleId", select: "type model image seats pricePerDay location" },
      { path: "companyId", select: COMPANY_FIELDS },
    ]);

    return res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      booking,
    });
  } catch (error) {
    return sendError(res, error, "Failed to update vehicle booking status");
  }
}

export async function cancelMyVehicleBooking(req, res) {
  try {
    const travelerId = getLoggedInUserId(req);
    const { id } = req.params;

    if (!travelerId || !isValidId(travelerId)) {
      return res.status(401).json({ success: false, message: "Please log in" });
    }
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await VehicleBooking.findOne({ _id: id, travelerId });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (["cancelled", "rejected", "completed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `A ${booking.status} booking cannot be cancelled`,
      });
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle booking cancelled successfully",
      booking,
    });
  } catch (error) {
    return sendError(res, error, "Failed to cancel vehicle booking");
  }
}

/* -------------------------------------------------------------------------- */
/* Vehicle review routes                                                       */
/* -------------------------------------------------------------------------- */

export async function getPublicVehicleReviews(req, res) {
  try {
    const { vehicleId } = req.params;
    if (!isValidId(vehicleId)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
    }

    const reviews = await VehicleReview.find({ vehicleId, isVisible: true })
      .populate("travelerId", "name profilePhoto")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    return sendError(res, error, "Failed to retrieve vehicle reviews");
  }
}

export async function createVehicleReview(req, res) {
  try {
    const travelerId = getLoggedInUserId(req);
    const { bookingId, rating, comment = "" } = req.body;

    if (!travelerId || !isValidId(travelerId)) {
      return res.status(401).json({ success: false, message: "Please log in" });
    }
    if (!isValidId(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number between 1 and 5",
      });
    }

    const booking = await VehicleBooking.findOne({
      _id: bookingId,
      travelerId,
      status: "completed",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "A completed eligible booking was not found",
      });
    }

    const review = await VehicleReview.create({
      vehicleId: booking.vehicleId,
      companyId: booking.companyId,
      travelerId,
      bookingId,
      rating: parsedRating,
      comment: String(comment || "").trim(),
    });

    await refreshVehicleRating(booking.vehicleId);
    await review.populate([
      { path: "travelerId", select: "name profilePhoto" },
      { path: "vehicleId", select: "type model image rating reviewCount" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Vehicle review submitted successfully",
      review,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A review has already been submitted for this booking",
      });
    }
    return sendError(res, error, "Failed to submit vehicle review", 400);
  }
}

export async function getCompanyVehicleReviews(req, res) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const reviews = await VehicleReview.find({ companyId: context.companyId })
      .populate("travelerId", "name email profilePhoto")
      .populate("vehicleId", "type model image rating reviewCount")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    return sendError(res, error, "Failed to retrieve company vehicle reviews");
  }
}

export async function replyToVehicleReview(req, res) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { id } = req.params;
    const companyReply = String(req.body.companyReply || "").trim();

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid review ID" });
    }
    if (companyReply.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot exceed 2000 characters",
      });
    }

    const review = await VehicleReview.findOne({ _id: id, companyId: context.companyId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or it does not belong to your company",
      });
    }

    review.companyReply = companyReply;
    await review.save();
    await review.populate([
      { path: "travelerId", select: "name email profilePhoto" },
      { path: "vehicleId", select: "type model image rating reviewCount" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Review reply saved successfully",
      review,
    });
  } catch (error) {
    return sendError(res, error, "Failed to save vehicle review reply");
  }
}
