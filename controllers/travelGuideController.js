import mongoose from "mongoose";
import TravelGuide from "../models/TravelGuide.js";

const USER_POPULATE_FIELDS = [
  "name",
  "firstName",
  "lastName",
  "username",
  "email",
  "phone",
  "phoneNumber",
  "profilePicture",
  "avatar",
  "image",
  "role",
].join(" ");

function getLoggedUserId(req) {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );
}

function getLoggedUserRole(req) {
  return String(
    req.user?.role ||
      req.user?.userType ||
      req.user?.type ||
      ""
  ).toLowerCase();
}

function isAdmin(req) {
  return ["admin", "administrator"].includes(
    getLoggedUserRole(req)
  );
}

function isSameUser(firstId, secondId) {
  return String(firstId || "") === String(secondId || "");
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function buildGuideUpdate(body, allowAdminFields = false) {
  const updateData = {};

  if (body.languages !== undefined) {
    updateData.languages = Array.isArray(body.languages)
      ? body.languages
      : [];
  }

  if (body.experience !== undefined) {
    updateData.experience = body.experience;
  }

  if (body.pricePerDay !== undefined) {
    updateData.pricePerDay = body.pricePerDay;
  }

  if (body.specialties !== undefined) {
    updateData.specialties = Array.isArray(body.specialties)
      ? body.specialties
      : [];
  }

  if (body.isAvailable !== undefined) {
    updateData.isAvailable = body.isAvailable;
  }

  if (allowAdminFields) {
    if (body.isApproved !== undefined) {
      updateData.isApproved = body.isApproved;
    }

    if (body.rating !== undefined) {
      updateData.rating = body.rating;
    }
  }

  return updateData;
}

/**
 * Public guide list.
 * Only approved and available guides are returned.
 */
export async function getGuides(req, res) {
  try {
    const guides = await TravelGuide.find({
      isApproved: true,
      isAvailable: true,
    })
      .populate("userId", USER_POPULATE_FIELDS)
      .sort({ rating: -1, createdAt: -1 });

    return res.status(200).json(guides);
  } catch (error) {
    console.error("Get guides error:", error);

    return res.status(500).json({
      message: "Failed to fetch travel guides",
    });
  }
}

/**
 * Admin guide list.
 * Returns approved, pending, available and unavailable guides.
 */
export async function getAllGuidesForAdmin(req, res) {
  try {
    const guides = await TravelGuide.find()
      .populate("userId", USER_POPULATE_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json(guides);
  } catch (error) {
    console.error("Admin get guides error:", error);

    return res.status(500).json({
      message: "Failed to fetch travel guides",
    });
  }
}

/**
 * Get one guide by ID.
 */
export async function getGuideById(req, res) {
  try {
    const guideId = req.params.id;

    if (!isValidObjectId(guideId)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findById(guideId).populate(
      "userId",
      USER_POPULATE_FIELDS
    );

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide not found",
      });
    }

    if (
      !guide.isApproved &&
      !isAdmin(req) &&
      !isSameUser(guide.userId?._id, getLoggedUserId(req))
    ) {
      return res.status(403).json({
        message: "You are not allowed to view this travel guide",
      });
    }

    return res.status(200).json(guide);
  } catch (error) {
    console.error("Get guide by ID error:", error);

    return res.status(500).json({
      message: "Failed to fetch travel guide",
    });
  }
}

/**
 * Get the logged-in user's guide profile.
 */
export async function getMyGuide(req, res) {
  try {
    const userId = getLoggedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Please log in again",
      });
    }

    const guide = await TravelGuide.findOne({
      userId,
    }).populate("userId", USER_POPULATE_FIELDS);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    return res.status(200).json(guide);
  } catch (error) {
    console.error("Get my guide error:", error);

    return res.status(500).json({
      message: "Failed to fetch travel guide profile",
    });
  }
}

/**
 * Create a guide profile.
 * userId is taken from the authenticated token, not req.body.
 */
export async function createGuide(req, res) {
  try {
    const userId = getLoggedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Please log in before creating a guide profile",
      });
    }

    const existingGuide = await TravelGuide.findOne({
      userId,
    });

    if (existingGuide) {
      return res.status(409).json({
        message:
          "A travel guide profile already exists for this user",
      });
    }

    const pricePerDay = Number(req.body.pricePerDay);

    if (!Number.isFinite(pricePerDay) || pricePerDay < 0) {
      return res.status(400).json({
        message: "Please enter a valid price per day",
      });
    }

    const guide = new TravelGuide({
      userId,
      languages: Array.isArray(req.body.languages)
        ? req.body.languages
        : [],
      experience: req.body.experience || "",
      pricePerDay,
      specialties: Array.isArray(req.body.specialties)
        ? req.body.specialties
        : [],
      isAvailable:
        req.body.isAvailable !== undefined
          ? req.body.isAvailable
          : true,
      isApproved: false,
      rating: 0,
    });

    await guide.save();

    const populatedGuide = await TravelGuide.findById(
      guide._id
    ).populate("userId", USER_POPULATE_FIELDS);

    return res.status(201).json({
      message: "Travel guide profile created successfully",
      guide: populatedGuide,
    });
  } catch (error) {
    console.error("Create guide error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        message:
          "A travel guide profile already exists for this user",
      });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create travel guide profile",
    });
  }
}

/**
 * Update guide.
 * Owner can update normal fields.
 * Admin can also update rating and approval status.
 */
export async function updateGuide(req, res) {
  try {
    const guideId = req.params.id;

    if (!isValidObjectId(guideId)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findById(guideId);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide not found",
      });
    }

    const loggedUserId = getLoggedUserId(req);
    const adminUser = isAdmin(req);

    if (
      !adminUser &&
      !isSameUser(guide.userId, loggedUserId)
    ) {
      return res.status(403).json({
        message:
          "You are not allowed to update this travel guide",
      });
    }

    const updateData = buildGuideUpdate(
      req.body,
      adminUser
    );

    Object.assign(guide, updateData);

    await guide.save();

    const updatedGuide = await TravelGuide.findById(
      guide._id
    ).populate("userId", USER_POPULATE_FIELDS);

    return res.status(200).json({
      message: "Travel guide updated successfully",
      guide: updatedGuide,
    });
  } catch (error) {
    console.error("Update guide error:", error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update travel guide",
    });
  }
}

/**
 * Admin approval.
 */
export async function approveGuide(req, res) {
  try {
    const guideId = req.params.id;

    if (!isValidObjectId(guideId)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findByIdAndUpdate(
      guideId,
      {
        isApproved: true,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("userId", USER_POPULATE_FIELDS);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide not found",
      });
    }

    return res.status(200).json({
      message: "Travel guide approved successfully",
      guide,
    });
  } catch (error) {
    console.error("Approve guide error:", error);

    return res.status(500).json({
      message: "Failed to approve travel guide",
    });
  }
}

/**
 * Admin rejection.
 */
export async function rejectGuide(req, res) {
  try {
    const guideId = req.params.id;

    if (!isValidObjectId(guideId)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findByIdAndUpdate(
      guideId,
      {
        isApproved: false,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("userId", USER_POPULATE_FIELDS);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide not found",
      });
    }

    return res.status(200).json({
      message: "Travel guide rejected successfully",
      guide,
    });
  } catch (error) {
    console.error("Reject guide error:", error);

    return res.status(500).json({
      message: "Failed to reject travel guide",
    });
  }
}

/**
 * Delete guide.
 * Owner or administrator can delete.
 */
export async function deleteGuide(req, res) {
  try {
    const guideId = req.params.id;

    if (!isValidObjectId(guideId)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findById(guideId);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide not found",
      });
    }

    const loggedUserId = getLoggedUserId(req);

    if (
      !isAdmin(req) &&
      !isSameUser(guide.userId, loggedUserId)
    ) {
      return res.status(403).json({
        message:
          "You are not allowed to delete this travel guide",
      });
    }

    await guide.deleteOne();

    return res.status(200).json({
      message: "Travel guide deleted successfully",
    });
  } catch (error) {
    console.error("Delete guide error:", error);

    return res.status(500).json({
      message: "Failed to delete travel guide",
    });
  }
}