import express from "express";

import {
  approveHotel,
  createHotel,
  deleteHotel,
  getAllHotels,
  getAllHotelsForAdmin,
  getHotelById,
  rejectHotel,
  updateHotel,
} from "../controllers/HotelController.js";

const router = express.Router();

/*
  Checks whether the user is logged in.

  Your server.js JWT middleware adds the decoded token
  information to req.user.
*/
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this route",
    });
  }

  next();
}

/*
  Checks whether the logged-in user is an administrator.

  Keep only the property used by your User model and JWT token.
*/
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

// Public route: approved and available hotels
router.get("/", getAllHotels);

// Admin route: retrieve all hotels
router.get(
  "/admin/all",
  requireAuth,
  adminOnly,
  getAllHotelsForAdmin
);

// Admin route: create a hotel
router.post(
  "/",
  requireAuth,
  adminOnly,
  createHotel
);

// Admin route: approve a hotel
router.put(
  "/:id/approve",
  requireAuth,
  adminOnly,
  approveHotel
);

// Admin route: reject a hotel
router.put(
  "/:id/reject",
  requireAuth,
  adminOnly,
  rejectHotel
);

// Admin route: update a hotel
router.put(
  "/:id",
  requireAuth,
  adminOnly,
  updateHotel
);

// Admin route: delete a hotel
router.delete(
  "/:id",
  requireAuth,
  adminOnly,
  deleteHotel
);

// Public route: retrieve one hotel
// Keep this route after /admin/all and the other named routes.
router.get("/:id", getHotelById);

export default router;