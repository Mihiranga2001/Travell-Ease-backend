import mongoose from "mongoose";
import Vehicle from "../models/vehicle.js";

const VEHICLE_TYPES = ["bike", "tuk", "car", "van", "bus"];

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isVehicleCompanyRole(role) {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === "vehicle_company" ||
    normalizedRole === "vehicle_comapny"
  );
}

function isAdminRole(role) {
  return normalizeRole(role) === "admin";
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function getAuthenticatedUserId(req) {
  const value =
    req.user?.id ||
    req.user?._id ||
    req.user?.userId ||
    req.user?.companyId;

  if (value && typeof value === "object") {
    return value._id || value.id || "";
  }

  return value || "";
}

function requireVehicleCompany(req, res) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication is required",
    });

    return null;
  }

  if (!isVehicleCompanyRole(req.user.role)) {
    res.status(403).json({
      success: false,
      message:
        "Only vehicle-company accounts can access this resource",
    });

    return null;
  }

  const companyId = getAuthenticatedUserId(req);

  if (!companyId || !isValidObjectId(companyId)) {
    res.status(400).json({
      success: false,
      message:
        "A valid logged-in vehicle-company user ID is missing from the authentication token",
    });

    return null;
  }

  return {
    companyId: String(companyId),
  };
}

function requireAdmin(req, res) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication is required",
    });

    return false;
  }

  if (!isAdminRole(req.user.role)) {
    res.status(403).json({
      success: false,
      message: "Administrator access is required",
    });

    return false;
  }

  return true;
}

function buildVehiclePayload(
  body,
  { partial = false } = {}
) {
  const payload = {};

  if (!partial || body.type !== undefined) {
    payload.type =
      typeof body.type === "string"
        ? body.type.trim().toLowerCase()
        : body.type;
  }

  if (!partial || body.model !== undefined) {
    payload.model =
      typeof body.model === "string"
        ? body.model.trim()
        : body.model;
  }

  if (!partial || body.image !== undefined) {
    payload.image =
      typeof body.image === "string"
        ? body.image.trim()
        : body.image;
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

  return payload;
}

function validateVehiclePayload(
  payload,
  { partial = false } = {}
) {
  if (
    (!partial || payload.type !== undefined) &&
    !VEHICLE_TYPES.includes(payload.type)
  ) {
    return "Vehicle type must be bike, tuk, car, van or bus";
  }

  if (!partial || payload.model !== undefined) {
    if (
      typeof payload.model !== "string" ||
      payload.model.length < 2
    ) {
      return "Vehicle model must contain at least 2 characters";
    }

    if (payload.model.length > 150) {
      return "Vehicle model cannot exceed 150 characters";
    }
  }

  if (!partial || payload.pricePerDay !== undefined) {
    if (
      !Number.isFinite(payload.pricePerDay) ||
      payload.pricePerDay < 0
    ) {
      return "Price per day must be a valid non-negative number";
    }
  }

  if (!partial || payload.seats !== undefined) {
    if (
      !Number.isInteger(payload.seats) ||
      payload.seats < 1
    ) {
      return "Seats must be a whole number of at least 1";
    }
  }

  if (!partial || payload.location !== undefined) {
    const latitude = Number(payload.location?.latitude);
    const longitude = Number(payload.location?.longitude);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return "Latitude must be between -90 and 90";
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return "Longitude must be between -180 and 180";
    }
  }

  return "";
}

function sendControllerError(
  res,
  error,
  fallbackMessage
) {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map(
      (validationError) => validationError.message
    );

    return res.status(400).json({
      success: false,
      message:
        errors[0] || "Vehicle validation failed",
      errors,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid database identifier",
    });
  }

  console.error(fallbackMessage, error);

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
    error: error.message,
  });
}

/**
 * GET /api/vehicles
 *
 * Public list:
 * - approved vehicles only
 * - available and unavailable vehicles are both returned
 */
export async function getVehicles(req, res) {
  try {
    const filter = {
      isApproved: true,
    };

    if (req.query.type) {
      const type = String(req.query.type)
        .trim()
        .toLowerCase();

      if (!VEHICLE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vehicle type",
        });
      }

      filter.type = type;
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

    if (req.query.isAvailable !== undefined) {
      const availabilityText = String(
        req.query.isAvailable
      ).toLowerCase();

      if (
        availabilityText !== "true" &&
        availabilityText !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isAvailable must be true or false",
        });
      }

      filter.isAvailable =
        availabilityText === "true";
    }

    if (
      req.query.minPrice !== undefined ||
      req.query.maxPrice !== undefined
    ) {
      filter.pricePerDay = {};

      if (req.query.minPrice !== undefined) {
        const minPrice = Number(req.query.minPrice);

        if (
          !Number.isFinite(minPrice) ||
          minPrice < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Minimum price must be a valid non-negative number",
          });
        }

        filter.pricePerDay.$gte = minPrice;
      }

      if (req.query.maxPrice !== undefined) {
        const maxPrice = Number(req.query.maxPrice);

        if (
          !Number.isFinite(maxPrice) ||
          maxPrice < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Maximum price must be a valid non-negative number",
          });
        }

        filter.pricePerDay.$lte = maxPrice;
      }
    }

    if (req.query.minSeats !== undefined) {
      const minSeats = Number(req.query.minSeats);

      if (
        !Number.isInteger(minSeats) ||
        minSeats < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Minimum seats must be a whole number of at least 1",
        });
      }

      filter.seats = {
        $gte: minSeats,
      };
    }

    const vehicles = await Vehicle.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to load vehicles"
    );
  }
}

/**
 * GET /api/vehicles/:id
 *
 * Public details:
 * - approved vehicle only
 * - still accessible when unavailable
 */
export async function getVehicleById(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      isApproved: true,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message:
          "Vehicle not found or has not been approved",
      });
    }

    return res.status(200).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to load vehicle"
    );
  }
}

/**
 * GET /api/vehicles/company/my
 */
export async function getMyCompanyVehicles(
  req,
  res
) {
  try {
    const context = requireVehicleCompany(
      req,
      res
    );

    if (!context) {
      return;
    }

    const vehicles = await Vehicle.find({
      companyId: context.companyId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to load company vehicles"
    );
  }
}

/**
 * POST /api/vehicles/company
 */
export async function createCompanyVehicle(
  req,
  res
) {
  try {
    const context = requireVehicleCompany(
      req,
      res
    );

    if (!context) {
      return;
    }

    const payload = buildVehiclePayload(req.body);
    const validationMessage =
      validateVehiclePayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const vehicle = await Vehicle.create({
      ...payload,
      companyId: context.companyId,
      isApproved: false,
      isAvailable: true,
    });

    return res.status(201).json({
      success: true,
      message:
        "Vehicle created and sent for administrator approval",
      vehicle,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to create vehicle"
    );
  }
}

/**
 * PUT /api/vehicles/company/:id
 *
 * Editing vehicle details resets approval to pending.
 * Availability is not changed here.
 */
export async function updateCompanyVehicle(
  req,
  res
) {
  try {
    const context = requireVehicleCompany(
      req,
      res
    );

    if (!context) {
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const payload = buildVehiclePayload(
      req.body,
      {
        partial: true,
      }
    );

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No vehicle fields were provided",
      });
    }

    const validationMessage =
      validateVehiclePayload(payload, {
        partial: true,
      });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const vehicle =
      await Vehicle.findOneAndUpdate(
        {
          _id: req.params.id,
          companyId: context.companyId,
        },
        {
          $set: {
            ...payload,
            isApproved: false,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message:
          "Vehicle not found or it does not belong to your company",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Vehicle updated and returned to pending approval",
      vehicle,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to update vehicle"
    );
  }
}

/**
 * DELETE /api/vehicles/company/:id
 */
export async function deleteCompanyVehicle(
  req,
  res
) {
  try {
    const context = requireVehicleCompany(
      req,
      res
    );

    if (!context) {
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle =
      await Vehicle.findOneAndDelete({
        _id: req.params.id,
        companyId: context.companyId,
      });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message:
          "Vehicle not found or it does not belong to your company",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to delete vehicle"
    );
  }
}

/**
 * PATCH /api/vehicles/company/:id/availability
 *
 * Changes only isAvailable.
 * It does not delete the vehicle and does not change approval.
 */
export async function updateCompanyVehicleAvailability(
  req,
  res
) {
  try {
    const context = requireVehicleCompany(
      req,
      res
    );

    if (!context) {
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    if (
      typeof req.body.isAvailable !==
      "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "isAvailable must be true or false",
      });
    }

    const vehicle =
      await Vehicle.findOneAndUpdate(
        {
          _id: req.params.id,
          companyId: context.companyId,
        },
        {
          $set: {
            isAvailable:
              req.body.isAvailable,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message:
          "Vehicle not found or it does not belong to your company",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Vehicle availability updated successfully",
      vehicle,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to update vehicle availability"
    );
  }
}

/**
 * GET /api/vehicles/admin/all
 */
export async function getAllVehiclesForAdmin(
  req,
  res
) {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    const filter = {};

    if (req.query.type) {
      const type = String(req.query.type)
        .trim()
        .toLowerCase();

      if (!VEHICLE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vehicle type",
        });
      }

      filter.type = type;
    }

    if (req.query.companyId) {
      if (!isValidObjectId(req.query.companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID",
        });
      }

      filter.companyId =
        req.query.companyId;
    }

    if (
      req.query.isApproved !== undefined
    ) {
      filter.isApproved =
        String(
          req.query.isApproved
        ).toLowerCase() === "true";
    }

    if (
      req.query.isAvailable !== undefined
    ) {
      filter.isAvailable =
        String(
          req.query.isAvailable
        ).toLowerCase() === "true";
    }

    const vehicles = await Vehicle.find(
      filter
    ).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to load admin vehicles"
    );
  }
}

/**
 * PUT /api/vehicles/:id/approve
 */
export async function approveVehicle(
  req,
  res
) {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle =
      await Vehicle.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            isApproved: true,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Vehicle approved successfully",
      vehicle,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to approve vehicle"
    );
  }
}

/**
 * PUT /api/vehicles/:id/reject
 */
export async function rejectVehicle(
  req,
  res
) {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle =
      await Vehicle.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            isApproved: false,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Vehicle moved to pending status",
      vehicle,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to reject vehicle"
    );
  }
}

/**
 * PATCH /api/vehicles/:id/availability
 *
 * Admin availability update.
 */
export async function updateVehicleAvailability(
  req,
  res
) {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    if (
      typeof req.body.isAvailable !==
      "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "isAvailable must be true or false",
      });
    }

    const vehicle =
      await Vehicle.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            isAvailable:
              req.body.isAvailable,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Vehicle availability updated successfully",
      vehicle,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to update vehicle availability"
    );
  }
}

/**
 * PUT /api/vehicles/:id
 *
 * Admin general update.
 */
export async function updateVehicle(
  req,
  res
) {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const payload = buildVehiclePayload(
      req.body,
      {
        partial: true,
      }
    );

    if (
      req.body.companyId !== undefined
    ) {
      if (
        !isValidObjectId(
          req.body.companyId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID",
        });
      }

      payload.companyId =
        req.body.companyId;
    }

    if (
      req.body.isApproved !== undefined
    ) {
      if (
        typeof req.body.isApproved !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isApproved must be true or false",
        });
      }

      payload.isApproved =
        req.body.isApproved;
    }

    if (
      req.body.isAvailable !== undefined
    ) {
      if (
        typeof req.body.isAvailable !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isAvailable must be true or false",
        });
      }

      payload.isAvailable =
        req.body.isAvailable;
    }

    const validationMessage =
      validateVehiclePayload(payload, {
        partial: true,
      });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const vehicle =
      await Vehicle.findByIdAndUpdate(
        req.params.id,
        {
          $set: payload,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Vehicle updated successfully",
      vehicle,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to update vehicle"
    );
  }
}

/**
 * DELETE /api/vehicles/:id
 */
export async function deleteVehicle(
  req,
  res
) {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    const vehicle =
      await Vehicle.findByIdAndDelete(
        req.params.id
      );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Vehicle deleted successfully",
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to delete vehicle"
    );
  }
}

/*
  Compatibility alias for older code that imports createVehicle.
*/
export const createVehicle =
  createCompanyVehicle;
