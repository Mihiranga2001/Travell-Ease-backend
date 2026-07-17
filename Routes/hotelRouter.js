import express from "express";

import {
  approveHotel,
  createOwnerHotel,
  deleteHotel,
  deleteOwnerHotel,
  getAllHotels,
  getAllHotelsForAdmin,
  getHotelById,
  getMyHotels,
  rejectHotel,
  updateHotel,
  updateOwnerHotel,
  updateOwnerHotelAvailability,
  updateOwnerRoomAvailability,
  updateOwnerRoomInventory,
} from "../controllers/HotelController.js";

const router = express.Router();

function getLoggedInUserId(req) {
  return (
    req.user?.userId ||
    req.user?.id ||
    req.user?._id ||
    null
  );
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

function hotelOwnerOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this route",
    });
  }

  if (req.user.role !== "hotel_owner") {
    return res.status(403).json({
      success: false,
      message: "Only hotel owners can access this route",
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

  const isAdmin =
    req.user.role === "admin" ||
    req.user.userType === "admin" ||
    req.user.isAdmin === true;

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only administrators can access this route",
    });
  }

  next();
}

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

// Approved and available hotels
router.get("/", getAllHotels);

/*
|--------------------------------------------------------------------------
| Hotel-owner routes
|--------------------------------------------------------------------------
*/

// Logged-in owner's hotels
router.get(
  "/owner/my",
  requireAuth,
  hotelOwnerOnly,
  getMyHotels
);

// Create hotel
router.post(
  "/owner",
  requireAuth,
  hotelOwnerOnly,
  createOwnerHotel
);

// Update hotel details
router.put(
  "/owner/:id",
  requireAuth,
  hotelOwnerOnly,
  updateOwnerHotel
);

// Delete owner's hotel
router.delete(
  "/owner/:id",
  requireAuth,
  hotelOwnerOnly,
  deleteOwnerHotel
);

// Change complete hotel availability
router.patch(
  "/owner/:id/availability",
  requireAuth,
  hotelOwnerOnly,
  updateOwnerHotelAvailability
);

// Change one room type's availability
router.patch(
  "/owner/:id/rooms/:roomIndex/availability",
  requireAuth,
  hotelOwnerOnly,
  updateOwnerRoomAvailability
);

// Change one room type's total physical-room count
router.patch(
  "/owner/:id/rooms/:roomIndex/inventory",
  requireAuth,
  hotelOwnerOnly,
  updateOwnerRoomInventory
);

/*
|--------------------------------------------------------------------------
| Admin routes
|--------------------------------------------------------------------------
*/

// Get all hotel submissions
router.get(
  "/admin/all",
  requireAuth,
  adminOnly,
  getAllHotelsForAdmin
);

// Approve hotel
router.put(
  "/:id/approve",
  requireAuth,
  adminOnly,
  approveHotel
);

// Reject hotel
router.put(
  "/:id/reject",
  requireAuth,
  adminOnly,
  rejectHotel
);

// Optional admin hotel update
router.put(
  "/:id",
  requireAuth,
  adminOnly,
  updateHotel
);

// Admin delete hotel
router.delete(
  "/:id",
  requireAuth,
  adminOnly,
  deleteHotel
);

/*
|--------------------------------------------------------------------------
| Public hotel details
|--------------------------------------------------------------------------
*/

// Keep this dynamic route last
router.get("/:id", getHotelById);

export default router;