import mongoose from "mongoose";
import Vehicle from "../models/vehicle.js";

/**
 * Convert request values into a clean Vehicle payload.
 * Only fields that exist in the Vehicle model are accepted.
 */
function buildVehiclePayload(body, { partial = false } = {}) {
  const payload = {};

  if (!partial || body.companyId !== undefined) {
    payload.companyId = body.companyId;
  }

  if (!partial || body.type !== undefined) {
    payload.type =
      typeof body.type === "string" ? body.type.trim().toLowerCase() : body.type;
  }

  if (!partial || body.model !== undefined) {
    payload.model =
      typeof body.model === "string" ? body.model.trim() : body.model;
  }

  if (!partial || body.image !== undefined) {
    payload.image =
      typeof body.image === "string" ? body.image.trim() : body.image;
  }

  if (!partial || body.pricePerDay !== undefined) {
    payload.pricePerDay = Number(body.pricePerDay);
  }

  if (!partial || body.seats !== undefined) {
    payload.seats = Number(body.seats);
  }

  if (!partial || body.location !== undefined) {
    payload.location = {
      latitude:
        body.location?.latitude === undefined ||
        body.location?.latitude === ""
          ? 0
          : Number(body.location.latitude),

      longitude:
        body.location?.longitude === undefined ||
        body.location?.longitude === ""
          ? 0
          : Number(body.location.longitude),
    };
  }

  if (!partial || body.isAvailable !== undefined) {
    payload.isAvailable = body.isAvailable;
  }

  if (!partial || body.isApproved !== undefined) {
    payload.isApproved = body.isApproved;
  }

  return payload;
}

/**
 * Validate an ObjectId parameter.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/vehicles
 * Public/client vehicle list.
 *
 * By default this returns only approved and available vehicles.
 * Optional query parameters:
 *   ?type=car
 *   ?companyId=<company id>
 *   ?minPrice=1000
 *   ?maxPrice=20000
 */
export async function getVehicles(req, res) {
  try {
    const filter = {
      isApproved: true,
      isAvailable: true,
    };

    if (req.query.type) {
      filter.type = req.query.type.trim().toLowerCase();
    }

    if (req.query.companyId) {
      if (!isValidObjectId(req.query.companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID",
        });
      }

      filter.companyId = req.query.companyId;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.pricePerDay = {};

      if (req.query.minPrice) {
        filter.pricePerDay.$gte = Number(req.query.minPrice);
      }

      if (req.query.maxPrice) {
        filter.pricePerDay.$lte = Number(req.query.maxPrice);
      }
    }

    const vehicles = await Vehicle.find(filter)
      .populate("companyId", "companyName name email phoneNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("getVehicles error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load vehicles",
      error: error.message,
    });
  }
}

/**
 * GET /api/vehicles/admin/all
 * Admin vehicle list, including approved, pending, available and unavailable.
 */
export async function getAllVehiclesForAdmin(req, res) {
  try {
    const filter = {};

    if (req.query.type) {
      filter.type = req.query.type.trim().toLowerCase();
    }

    if (req.query.companyId) {
      if (!isValidObjectId(req.query.companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID",
        });
      }

      filter.companyId = req.query.companyId;
    }

    if (req.query.isApproved !== undefined) {
      filter.isApproved = req.query.isApproved === "true";
    }

    if (req.query.isAvailable !== undefined) {
      filter.isAvailable = req.query.isAvailable === "true";
    }

    const vehicles = await Vehicle.find(filter)
      .populate("companyId", "companyName name email phoneNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("getAllVehiclesForAdmin error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load admin vehicles",
      error: error.message,
    });
  }
}

/**
 * GET /api/vehicles/:id
 */
export async function getVehicleById(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findById(req.params.id).populate(
      "companyId",
      "companyName name email phoneNumber"
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    console.error("getVehicleById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load vehicle",
      error: error.message,
    });
  }
}

/**
 * POST /api/vehicles
 */
export async function createVehicle(req, res) {
  try {
    const payload = buildVehiclePayload(req.body);

    if (!payload.companyId || !isValidObjectId(payload.companyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid companyId is required",
      });
    }

    const vehicle = await Vehicle.create(payload);

    const populatedVehicle = await Vehicle.findById(vehicle._id).populate(
      "companyId",
      "companyName name email phoneNumber"
    );

    return res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      vehicle: populatedVehicle,
    });
  } catch (error) {
    console.error("createVehicle error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(
        (validationError) => validationError.message
      );

      return res.status(400).json({
        success: false,
        message: errors[0] || "Vehicle validation failed",
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create vehicle",
      error: error.message,
    });
  }
}

/**
 * PUT /api/vehicles/:id
 * Supports full or partial updates.
 */
export async function updateVehicle(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const payload = buildVehiclePayload(req.body, { partial: true });

    if (
      payload.companyId !== undefined &&
      !isValidObjectId(payload.companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid companyId",
      });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      {
        new: true,
        runValidators: true,
      }
    ).populate("companyId", "companyName name email phoneNumber");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      vehicle,
    });
  } catch (error) {
    console.error("updateVehicle error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(
        (validationError) => validationError.message
      );

      return res.status(400).json({
        success: false,
        message: errors[0] || "Vehicle validation failed",
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update vehicle",
      error: error.message,
    });
  }
}

/**
 * PUT /api/vehicles/:id/approve
 */
export async function approveVehicle(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: { isApproved: true } },
      {
        new: true,
        runValidators: true,
      }
    ).populate("companyId", "companyName name email phoneNumber");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle approved successfully",
      vehicle,
    });
  } catch (error) {
    console.error("approveVehicle error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve vehicle",
      error: error.message,
    });
  }
}

/**
 * PUT /api/vehicles/:id/reject
 *
 * The model does not have a separate rejected status.
 * Rejecting moves the vehicle back to the unapproved/pending state.
 */
export async function rejectVehicle(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: { isApproved: false } },
      {
        new: true,
        runValidators: true,
      }
    ).populate("companyId", "companyName name email phoneNumber");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle moved to pending status",
      vehicle,
    });
  } catch (error) {
    console.error("rejectVehicle error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject vehicle",
      error: error.message,
    });
  }
}

/**
 * PATCH /api/vehicles/:id/availability
 * Body: { "isAvailable": true }
 */
export async function updateVehicleAvailability(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    if (typeof req.body.isAvailable !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isAvailable must be true or false",
      });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: { isAvailable: req.body.isAvailable } },
      {
        new: true,
        runValidators: true,
      }
    ).populate("companyId", "companyName name email phoneNumber");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle availability updated successfully",
      vehicle,
    });
  } catch (error) {
    console.error("updateVehicleAvailability error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update vehicle availability",
      error: error.message,
    });
  }
}

/**
 * DELETE /api/vehicles/:id
 */
export async function deleteVehicle(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("deleteVehicle error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete vehicle",
      error: error.message,
    });
  }
}