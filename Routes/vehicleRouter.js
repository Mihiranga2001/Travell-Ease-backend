import express from "express";

import {
  approveVehicle,
  createVehicle,
  deleteVehicle,
  getAllVehiclesForAdmin,
  getVehicleById,
  getVehicles,
  rejectVehicle,
  updateVehicle,
  updateVehicleAvailability,
} from "../Controllers/vehicleController.js";

const router = express.Router();

router.get("/", getVehicles);

router.get("/admin/all", getAllVehiclesForAdmin);

router.post("/", createVehicle);

router.put("/:id/approve", approveVehicle);
router.put("/:id/reject", rejectVehicle);

router.patch(
  "/:id/availability",
  updateVehicleAvailability
);

router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

router.get("/:id", getVehicleById);

export default router;