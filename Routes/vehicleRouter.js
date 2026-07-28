import express from "express";

import {
  approveVehicle,
  cancelMyVehicleBooking,
  createCompanyVehicle,
  createVehicleBooking,
  createVehicleReview,
  deleteCompanyVehicle,
  deleteVehicle,
  getAllVehiclesForAdmin,
  getCompanyVehicleBookings,
  getCompanyVehicleReviews,
  getMyCompanyVehicles,
  getMyVehicleBookings,
  getPublicVehicleReviews,
  getVehicleById,
  getVehicles,
  rejectVehicle,
  replyToVehicleReview,
  updateCompanyBookingStatus,
  updateCompanyVehicle,
  updateCompanyVehicleAvailability,
  updateVehicle,
  updateVehicleAvailability,
} from "../controllers/VehicleController.js";

const vehicleRouter = express.Router();
const vehicleBookingRouter = express.Router();
const vehicleReviewRouter = express.Router();

function getLoggedInUserId(req) {
  return req.user?.userId || req.user?.id || req.user?._id || null;
}

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function requireAuth(req, res, next) {
  if (!getLoggedInUserId(req)) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this route",
    });
  }

  next();
}

function vehicleCompanyOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this route",
    });
  }

  const role = normalizeRole(req.user.role || req.user.userType);

  if (role !== "vehicle_company" && role !== "vehicle_comapny") {
    return res.status(403).json({
      success: false,
      message: "Only vehicle companies can access this route",
    });
  }

  next();
}

function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this route",
    });
  }

  const role = normalizeRole(req.user.role || req.user.userType);
  const isAdmin = role === "admin" || req.user.isAdmin === true;

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only administrators can access this route",
    });
  }

  next();
}

/* Vehicle routes mounted at /api/vehicles */
vehicleRouter.get("/", getVehicles);

vehicleRouter.get(
  "/company/my",
  requireAuth,
  vehicleCompanyOnly,
  getMyCompanyVehicles
);
vehicleRouter.post(
  "/company",
  requireAuth,
  vehicleCompanyOnly,
  createCompanyVehicle
);
vehicleRouter.put(
  "/company/:id",
  requireAuth,
  vehicleCompanyOnly,
  updateCompanyVehicle
);
vehicleRouter.delete(
  "/company/:id",
  requireAuth,
  vehicleCompanyOnly,
  deleteCompanyVehicle
);
vehicleRouter.patch(
  "/company/:id/availability",
  requireAuth,
  vehicleCompanyOnly,
  updateCompanyVehicleAvailability
);

vehicleRouter.get(
  "/admin/all",
  requireAuth,
  adminOnly,
  getAllVehiclesForAdmin
);
vehicleRouter.put(
  "/:id/approve",
  requireAuth,
  adminOnly,
  approveVehicle
);
vehicleRouter.put(
  "/:id/reject",
  requireAuth,
  adminOnly,
  rejectVehicle
);
vehicleRouter.patch(
  "/:id/availability",
  requireAuth,
  adminOnly,
  updateVehicleAvailability
);
vehicleRouter.put(
  "/:id",
  requireAuth,
  adminOnly,
  updateVehicle
);
vehicleRouter.delete(
  "/:id",
  requireAuth,
  adminOnly,
  deleteVehicle
);

// Keep the dynamic public route last.
vehicleRouter.get("/:id", getVehicleById);

/* Booking routes mounted at /api/vehicle-bookings */
vehicleBookingRouter.post("/", requireAuth, createVehicleBooking);
vehicleBookingRouter.get("/my", requireAuth, getMyVehicleBookings);
vehicleBookingRouter.patch(
  "/my/:id/cancel",
  requireAuth,
  cancelMyVehicleBooking
);
vehicleBookingRouter.get(
  "/company/my",
  requireAuth,
  vehicleCompanyOnly,
  getCompanyVehicleBookings
);
vehicleBookingRouter.patch(
  "/company/:id/status",
  requireAuth,
  vehicleCompanyOnly,
  updateCompanyBookingStatus
);

/* Review routes mounted at /api/vehicle-reviews */
vehicleReviewRouter.get("/vehicle/:vehicleId", getPublicVehicleReviews);
vehicleReviewRouter.post("/", requireAuth, createVehicleReview);
vehicleReviewRouter.get(
  "/company/my",
  requireAuth,
  vehicleCompanyOnly,
  getCompanyVehicleReviews
);
vehicleReviewRouter.patch(
  "/company/:id/reply",
  requireAuth,
  vehicleCompanyOnly,
  replyToVehicleReview
);

export { vehicleBookingRouter, vehicleReviewRouter };
export default vehicleRouter;
