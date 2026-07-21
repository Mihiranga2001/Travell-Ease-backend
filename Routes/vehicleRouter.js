import express from "express";

import {
  approveVehicle,
  createCompanyVehicle,
  createVehicle,
  deleteCompanyVehicle,
  deleteVehicle,
  getAllVehiclesForAdmin,
  getMyCompanyVehicles,
  getVehicleById,
  getVehicles,
  rejectVehicle,
  updateCompanyVehicle,
  updateCompanyVehicleAvailability,
  updateVehicle,
  updateVehicleAvailability,
} from "../Controllers/vehicleController.js";

const router = express.Router();

/*
  PUBLIC LIST
*/
router.get("/", getVehicles);

/*
  ADMIN AND COMPANY STATIC ROUTES

  Keep these before "/:id".
*/
router.get(
  "/admin/all",
  getAllVehiclesForAdmin
);

router.get(
  "/company/my",
  getMyCompanyVehicles
);

router.post(
  "/company",
  createCompanyVehicle
);

router.put(
  "/company/:id",
  updateCompanyVehicle
);

router.delete(
  "/company/:id",
  deleteCompanyVehicle
);

router.patch(
  "/company/:id/availability",
  updateCompanyVehicleAvailability
);

/*
  Optional compatibility route for older clients.
  It still uses secure vehicle-company creation.
*/
router.post("/", createVehicle);

/*
  ADMIN MANAGEMENT
*/
router.put(
  "/:id/approve",
  approveVehicle
);

router.put(
  "/:id/reject",
  rejectVehicle
);

router.patch(
  "/:id/availability",
  updateVehicleAvailability
);

router.put(
  "/:id",
  updateVehicle
);

router.delete(
  "/:id",
  deleteVehicle
);

/*
  PUBLIC DETAILS

  Keep this last.
*/
router.get(
  "/:id",
  getVehicleById
);

export default router;
