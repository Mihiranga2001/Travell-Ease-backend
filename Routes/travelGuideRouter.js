import express from "express";

import {
  approveGuide,
  createGuide,
  deleteGuide,
  getAllGuidesForAdmin,
  getGuideById,
  getGuides,
  getMyGuide,
  rejectGuide,
  updateGuide,
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

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

travelGuideRouter.get("/", getGuides);

/*
|--------------------------------------------------------------------------
| Logged-in guide routes
|--------------------------------------------------------------------------
*/

travelGuideRouter.get(
  "/my-profile",
  requireLogin,
  getMyGuide
);

/*
|--------------------------------------------------------------------------
| Admin routes
|--------------------------------------------------------------------------
|
| These routes must appear before /:id.
|
*/

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

/*
|--------------------------------------------------------------------------
| General guide routes
|--------------------------------------------------------------------------
*/

travelGuideRouter.get("/:id", getGuideById);

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

export default travelGuideRouter;