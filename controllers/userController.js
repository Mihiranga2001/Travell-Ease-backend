import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User, { USER_ROLES } from "../models/User.js";

const PUBLIC_REGISTRATION_ROLES = [
  "traveler",
  "hotel_owner",
  "vehicle_company",
  "guide",
];

function getAuthenticatedUserId(req) {
  return req.user?.userId || req.user?.id || req.user?._id || null;
}

function createToken(user) {
  const secret = process.env.JWT_SECRET_KEY;

  if (!secret) {
    throw new Error("JWT_SECRET_KEY is not configured");
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    secret,
    {
      expiresIn: "7d",
    }
  );
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const userObject =
    typeof user.toObject === "function" ? user.toObject() : { ...user };

  delete userObject.password;

  return userObject;
}

function sendControllerError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists",
    });
  }

  if (error?.name === "ValidationError") {
    const errors = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));

    return res.status(400).json({
      success: false,
      message: errors[0]?.message || "Validation failed",
      errors,
    });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeInterests(interests) {
  if (!Array.isArray(interests)) {
    return [];
  }

  return interests
    .map((interest) => String(interest).trim())
    .filter(Boolean);
}

function normalizeLocation(location) {
  if (!location || typeof location !== "object") {
    return {
      latitude: 0,
      longitude: 0,
    };
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  return {
    latitude: Number.isFinite(latitude) ? latitude : 0,
    longitude: Number.isFinite(longitude) ? longitude : 0,
  };
}

// POST /api/users/register
export async function registerUser(req, res) {
  try {
    const {
      name,
      email,
      password,
      role = "traveler",
      phoneNumber = "",
      profilePhoto = "",
      bio = "",
      location,
      interests = [],
    } = req.body;

    if (!String(name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters",
      });
    }

    if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration role",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      phoneNumber: String(phoneNumber || "").trim(),
      profilePhoto: String(profilePhoto || "").trim(),
      bio: String(bio || "").trim(),
      location: normalizeLocation(location),
      interests: normalizeInterests(interests),
      isVerified: false,
      isBlocked: false,
    });

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to register user");
  }
}

// POST /api/users/login
export async function loginUser(req, res) {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to log in");
  }
}

// GET /api/users/me
export async function getCurrentUser(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Failed to retrieve current user"
    );
  }
}

// PUT /api/users/me
export async function updateCurrentUser(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const allowedFields = [
      "name",
      "email",
      "phoneNumber",
      "profilePhoto",
      "bio",
      "location",
      "interests",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "email") {
          user.email = normalizeEmail(req.body.email);
        } else if (field === "location") {
          user.location = normalizeLocation(req.body.location);
        } else if (field === "interests") {
          user.interests = normalizeInterests(req.body.interests);
        } else if (
          ["name", "phoneNumber", "profilePhoto", "bio"].includes(field)
        ) {
          user[field] = String(req.body[field] || "").trim();
        }
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to update profile");
  }
}

// PUT /api/users/me/password
export async function changePassword(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 6 characters",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to change password");
  }
}

// GET /api/users
export async function getAllUsers(req, res) {
  try {
    const {
      role,
      status,
      verified,
      search,
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};

    if (role && USER_ROLES.includes(role)) {
      query.role = role;
    }

    if (status === "active") {
      query.isBlocked = false;
    } else if (status === "blocked") {
      query.isBlocked = true;
    }

    if (verified === "true") {
      query.isVerified = true;
    } else if (verified === "false") {
      query.isVerified = false;
    }

    if (String(search || "").trim()) {
      const escapedSearch = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchExpression = new RegExp(escapedSearch, "i");

      query.$or = [
        { name: searchExpression },
        { email: searchExpression },
        { phoneNumber: searchExpression },
        { bio: searchExpression },
        { interests: searchExpression },
      ];
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const skip = (pageNumber - 1) * limitNumber;

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limitNumber),
      },
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to retrieve users");
  }
}

// GET /api/users/:id
export async function getUserById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to retrieve user");
  }
}

// PUT /api/users/:id
export async function updateUser(req, res) {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const allowedFields = [
      "name",
      "email",
      "role",
      "phoneNumber",
      "profilePhoto",
      "bio",
      "location",
      "interests",
      "isVerified",
      "isBlocked",
    ];

    for (const field of allowedFields) {
      if (req.body[field] === undefined) {
        continue;
      }

      if (field === "email") {
        user.email = normalizeEmail(req.body.email);
      } else if (field === "location") {
        user.location = normalizeLocation(req.body.location);
      } else if (field === "interests") {
        user.interests = normalizeInterests(req.body.interests);
      } else if (field === "role") {
        if (!USER_ROLES.includes(req.body.role)) {
          return res.status(400).json({
            success: false,
            message: "Invalid user role",
          });
        }

        user.role = req.body.role;
      } else if (["isVerified", "isBlocked"].includes(field)) {
        user[field] = Boolean(req.body[field]);
      } else {
        user[field] = String(req.body[field] || "").trim();
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to update user");
  }
}

// DELETE /api/users/:id
export async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    const currentUserId = String(getAuthenticatedUserId(req) || "");

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account from the admin page",
      });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to delete user");
  }
}