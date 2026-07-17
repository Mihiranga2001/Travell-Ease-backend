import express from "express";
import User from "../models/User.js";

import {
  changePassword,
  deleteUser,
  getAllUsers,
  getCurrentUser,
  getUserById,
  loginUser,
  registerUser,
  updateCurrentUser,
  updateUser,
} from "../controllers/userController.js";

const router = express.Router();

function getAuthenticatedUserId(req) {
  return req.user?.userId || req.user?.id || req.user?._id || null;
}

function requireAuth(req, res, next) {
  if (!getAuthenticatedUserId(req)) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this route",
    });
  }

  next();
}

async function adminOnly(req, res, next) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to access this route",
      });
    }

    const authenticatedUser = await User.findById(userId).select(
      "role isBlocked"
    );

    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user was not found",
      });
    }

    if (authenticatedUser.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    if (authenticatedUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can access this route",
      });
    }

    req.authUser = authenticatedUser;
    next();
  } catch (error) {
    console.error("Admin authorization error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to authorize administrator",
    });
  }
}

// Public authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Logged-in user routes
router.get("/me", requireAuth, getCurrentUser);
router.put("/me", requireAuth, updateCurrentUser);
router.put("/me/password", requireAuth, changePassword);

// Admin routes used by AdminUsersPage
router.get("/", requireAuth, adminOnly, getAllUsers);
router.get("/:id", requireAuth, adminOnly, getUserById);
router.put("/:id", requireAuth, adminOnly, updateUser);
router.delete("/:id", requireAuth, adminOnly, deleteUser);

export default router;