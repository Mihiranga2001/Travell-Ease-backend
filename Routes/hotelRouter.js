import express from "express";

import {
  approveHotel,
  cancelMyHotelBooking,
  createHotelBooking,
  createHotelReview,
  createOwnerHotel,
  deleteHotel,
  deleteOwnerHotel,
  getAllHotels,
  getAllHotelsForAdmin,
  getHotelById,
  getMyHotelBookings,
  getMyHotels,
  getOwnerHotelBookings,
  getOwnerHotelReviews,
  getPublicHotelReviews,
  rejectHotel,
  replyToHotelReview,
  updateHotel,
  updateOwnerBookingStatus,
  updateOwnerHotel,
  updateOwnerHotelAvailability,
  updateOwnerRoomAvailability,
  updateOwnerRoomInventory,
} from "../controllers/HotelController.js";

/*
|--------------------------------------------------------------------------
| Routers
|--------------------------------------------------------------------------
|
| All hotel-related routers are kept in this one file.
|
| index.js must mount them as:
|
| app.use("/api/hotels", hotelRouter);
| app.use("/api/bookings", hotelBookingRouter);
| app.use("/api/reviews", hotelReviewRouter);
|
*/

const hotelRouter = express.Router();
const hotelBookingRouter = express.Router();
const hotelReviewRouter = express.Router();

/*
|--------------------------------------------------------------------------
| Authentication helpers
|--------------------------------------------------------------------------
|
| Your global JWT middleware in index.js already verifies the token and
| assigns the decoded payload to req.user. Therefore, this file does not
| import authenticateToken.js.
|
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

function normalizeRole(value) {
  return String(value || "")
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

  return next();
}

function hotelOwnerOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this route",
    });
  }

  const role = normalizeRole(
    req.user.role || req.user.userType
  );

  const isHotelOwner =
    role === "hotel_owner" || role === "hotelowner";

  if (!isHotelOwner) {
    return res.status(403).json({
      success: false,
      message: "Only hotel owners can access this route",
    });
  }

  return next();
}

function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this route",
    });
  }

  const role = normalizeRole(
    req.user.role || req.user.userType
  );

  const isAdmin =
    role === "admin" || req.user.isAdmin === true;

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only administrators can access this route",
    });
  }

  return next();
}

/*
|--------------------------------------------------------------------------
| Hotel routes — mounted at /api/hotels
|--------------------------------------------------------------------------
*/

// Public hotel list
hotelRouter.get("/", getAllHotels);

// Logged-in hotel owner's hotels
hotelRouter.get(
  "/owner/my",
  requireAuth,
  hotelOwnerOnly,
  getMyHotels
);

// Create a hotel
hotelRouter.post(
  "/owner",
  requireAuth,
  hotelOwnerOnly,
  createOwnerHotel
);

// Update an owner's hotel
hotelRouter.put(
  "/owner/:id",
  requireAuth,
  hotelOwnerOnly,
  updateOwnerHotel
);

// Delete an owner's hotel
hotelRouter.delete(
  "/owner/:id",
  requireAuth,
  hotelOwnerOnly,
  deleteOwnerHotel
);

// Change complete hotel availability
hotelRouter.patch(
  "/owner/:id/availability",
  requireAuth,
  hotelOwnerOnly,
  updateOwnerHotelAvailability
);

// Change one room type's availability
hotelRouter.patch(
  "/owner/:id/rooms/:roomIndex/availability",
  requireAuth,
  hotelOwnerOnly,
  updateOwnerRoomAvailability
);

// Change one room type's inventory
hotelRouter.patch(
  "/owner/:id/rooms/:roomIndex/inventory",
  requireAuth,
  hotelOwnerOnly,
  updateOwnerRoomInventory
);

// Administrator hotel list
hotelRouter.get(
  "/admin/all",
  requireAuth,
  adminOnly,
  getAllHotelsForAdmin
);

// Approve a hotel
hotelRouter.put(
  "/:id/approve",
  requireAuth,
  adminOnly,
  approveHotel
);

// Reject a hotel
hotelRouter.put(
  "/:id/reject",
  requireAuth,
  adminOnly,
  rejectHotel
);

// Administrator hotel update
hotelRouter.put(
  "/:id",
  requireAuth,
  adminOnly,
  updateHotel
);

// Administrator hotel delete
hotelRouter.delete(
  "/:id",
  requireAuth,
  adminOnly,
  deleteHotel
);

// Keep the dynamic public route last
hotelRouter.get("/:id", getHotelById);

/*
|--------------------------------------------------------------------------
| Booking routes — mounted at /api/bookings
|--------------------------------------------------------------------------
*/

// Traveler creates a booking
hotelBookingRouter.post(
  "/",
  requireAuth,
  createHotelBooking
);

// Traveler views their bookings
hotelBookingRouter.get(
  "/my",
  requireAuth,
  getMyHotelBookings
);

// Hotel owner views bookings for their hotels
hotelBookingRouter.get(
  "/owner/my",
  requireAuth,
  hotelOwnerOnly,
  getOwnerHotelBookings
);

// Hotel owner changes booking status
hotelBookingRouter.patch(
  "/owner/:id/status",
  requireAuth,
  hotelOwnerOnly,
  updateOwnerBookingStatus
);

// Traveler cancels their booking
hotelBookingRouter.patch(
  "/:id/cancel",
  requireAuth,
  cancelMyHotelBooking
);

/*
|--------------------------------------------------------------------------
| Review routes — mounted at /api/reviews
|--------------------------------------------------------------------------
*/

// Public hotel reviews
hotelReviewRouter.get(
  "/hotel/:hotelId",
  getPublicHotelReviews
);

// Traveler creates a review
hotelReviewRouter.post(
  "/",
  requireAuth,
  createHotelReview
);

// Hotel owner views reviews for their hotels
hotelReviewRouter.get(
  "/owner/my",
  requireAuth,
  hotelOwnerOnly,
  getOwnerHotelReviews
);

// Hotel owner replies to a review
hotelReviewRouter.patch(
  "/owner/:id/reply",
  requireAuth,
  hotelOwnerOnly,
  replyToHotelReview
);

export {
  hotelBookingRouter,
  hotelReviewRouter,
};

export default hotelRouter;
