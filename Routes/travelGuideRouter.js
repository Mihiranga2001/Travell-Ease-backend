import express from "express";
import {
  approveGuide,
  createGuide,
  createGuideBooking,
  createGuideReview,
  deleteGuide,
  getAllGuidesForAdmin,
  getGuideById,
  getGuides,
  getMyBookings,
  getMyDashboard,
  getMyEarnings,
  getMyGuide,
  getMyReports,
  getMyReviews,
  rejectGuide,
  updateGuide,
  updateMyAvailability,
  updateMyBookingStatus,
  updateMySettings,
  updateMySkills,
} from "../controllers/travelGuideController.js";

const travelGuideRouter = express.Router();

function requireLogin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Please log in to continue",
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Please log in to continue",
    });
  }

  const role = String(
    req.user?.role ||
      req.user?.userType ||
      req.user?.type ||
      ""
  ).toLowerCase();

  if (!["admin", "administrator"].includes(role)) {
    return res.status(403).json({
      message: "Administrator access is required",
    });
  }

  next();
}

/* Public list */
travelGuideRouter.get("/", getGuides);

/* Logged-in guide profile and dashboard tabs */
travelGuideRouter.get(
  "/my-profile",
  requireLogin,
  getMyGuide
);

travelGuideRouter.get(
  "/my/dashboard",
  requireLogin,
  getMyDashboard
);

travelGuideRouter.get(
  "/my/bookings",
  requireLogin,
  getMyBookings
);

travelGuideRouter.patch(
  "/my/bookings/:bookingId/status",
  requireLogin,
  updateMyBookingStatus
);

travelGuideRouter.get(
  "/my/reviews",
  requireLogin,
  getMyReviews
);

travelGuideRouter.get(
  "/my/earnings",
  requireLogin,
  getMyEarnings
);

travelGuideRouter.get(
  "/my/reports",
  requireLogin,
  getMyReports
);

travelGuideRouter.patch(
  "/my/availability",
  requireLogin,
  updateMyAvailability
);

travelGuideRouter.patch(
  "/my/skills",
  requireLogin,
  updateMySkills
);

travelGuideRouter.patch(
  "/my/settings",
  requireLogin,
  updateMySettings
);

/* Administrator */
travelGuideRouter.get(
  "/admin/all",
  requireAdmin,
  getAllGuidesForAdmin
);

travelGuideRouter.put(
  "/:id/approve",
  requireAdmin,
  approveGuide
);

travelGuideRouter.put(
  "/:id/reject",
  requireAdmin,
  rejectGuide
);

/* Create and update guide profile */
travelGuideRouter.post(
  "/",
  requireLogin,
  createGuide
);

travelGuideRouter.put(
  "/:id",
  requireLogin,
  updateGuide
);

travelGuideRouter.delete(
  "/:id",
  requireLogin,
  deleteGuide
);

/* Traveler booking and review */
travelGuideRouter.post(
  "/:guideId/bookings",
  requireLogin,
  createGuideBooking
);

travelGuideRouter.post(
  "/:guideId/reviews",
  requireLogin,
  createGuideReview
);

/* Dynamic public route must stay last */
travelGuideRouter.get("/:id", getGuideById);

export default travelGuideRouter;
