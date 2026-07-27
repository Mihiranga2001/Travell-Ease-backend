import mongoose from "mongoose";
import TravelGuide from "../models/TravelGuide.js";
import TravelGuideBooking from "../models/TravelGuideBooking.js";
import TravelGuideReview from "../models/TravelGuideReview.js";

const USER_FIELDS = [
  "name",
  "firstName",
  "lastName",
  "username",
  "email",
  "phone",
  "phoneNumber",
  "profilePicture",
  "profileImage",
  "avatar",
  "image",
  "role",
].join(" ");

function userIdFromRequest(req) {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );
}

function roleFromRequest(req) {
  return String(
    req.user?.role ||
      req.user?.userType ||
      req.user?.type ||
      ""
  ).toLowerCase();
}

function isAdmin(req) {
  return ["admin", "administrator"].includes(
    roleFromRequest(req)
  );
}

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function sameId(first, second) {
  return String(first || "") === String(second || "");
}

function cleanTextArray(values, maximumLength = 100) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) =>
      String(value || "").trim().slice(0, maximumLength)
    )
    .filter(Boolean)
    .filter(
      (value, index, items) =>
        items.findIndex(
          (item) =>
            item.toLowerCase() === value.toLowerCase()
        ) === index
    );
}

async function findOwnedGuide(req) {
  const userId = userIdFromRequest(req);

  if (!userId) {
    return null;
  }

  return TravelGuide.findOne({ userId });
}

async function populateGuide(guideId) {
  return TravelGuide.findById(guideId).populate(
    "userId",
    USER_FIELDS
  );
}

async function recalculateGuideRating(guideId) {
  const reviews = await TravelGuideReview.find({
    guideId,
  }).select("rating");

  const count = reviews.length;
  const average =
    count === 0
      ? 0
      : reviews.reduce(
          (total, review) => total + review.rating,
          0
        ) / count;

  await TravelGuide.findByIdAndUpdate(guideId, {
    rating: Number(average.toFixed(2)),
    reviewCount: count,
  });
}

function bookingDays(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return null;
  }

  const difference = end.getTime() - start.getTime();

  return Math.max(
    1,
    Math.ceil(difference / (1000 * 60 * 60 * 24)) + 1
  );
}

function monthKey(dateValue) {
  const date = new Date(dateValue);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-");

  return new Date(
    Number(year),
    Number(month) - 1,
    1
  ).toLocaleDateString("en-LK", {
    month: "long",
    year: "numeric",
  });
}

function bookingSummary(bookings) {
  return {
    totalBookings: bookings.length,
    pendingBookings: bookings.filter(
      (item) => item.status === "pending"
    ).length,
    approvedBookings: bookings.filter(
      (item) => item.status === "approved"
    ).length,
    completedBookings: bookings.filter(
      (item) => item.status === "completed"
    ).length,
    rejectedBookings: bookings.filter(
      (item) => item.status === "rejected"
    ).length,
    cancelledBookings: bookings.filter(
      (item) => item.status === "cancelled"
    ).length,
    totalEarnings: bookings
      .filter((item) => item.status === "completed")
      .reduce(
        (total, item) => total + Number(item.totalAmount || 0),
        0
      ),
  };
}

export async function getGuides(req, res) {
  try {
    const guides = await TravelGuide.find({
      isApproved: true,
      isAvailable: true,
    })
      .populate("userId", USER_FIELDS)
      .sort({ rating: -1, createdAt: -1 });

    return res.status(200).json(guides);
  } catch (error) {
    console.error("Get travel guides error:", error);

    return res.status(500).json({
      message: "Failed to fetch travel guides",
    });
  }
}

export async function getAllGuidesForAdmin(req, res) {
  try {
    const guides = await TravelGuide.find()
      .populate("userId", USER_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json(guides);
  } catch (error) {
    console.error("Admin get travel guides error:", error);

    return res.status(500).json({
      message: "Failed to fetch travel guides",
    });
  }
}

export async function getGuideById(req, res) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await populateGuide(req.params.id);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide not found",
      });
    }

    if (!guide.isApproved && !isAdmin(req)) {
      const loggedUserId = userIdFromRequest(req);
      const ownerId = guide.userId?._id || guide.userId;

      if (!sameId(loggedUserId, ownerId)) {
        return res.status(403).json({
          message: "This guide profile is not public",
        });
      }
    }

    return res.status(200).json(guide);
  } catch (error) {
    console.error("Get guide by ID error:", error);

    return res.status(500).json({
      message: "Failed to fetch travel guide",
    });
  }
}

export async function getMyGuide(req, res) {
  try {
    const guide = await TravelGuide.findOne({
      userId: userIdFromRequest(req),
    }).populate("userId", USER_FIELDS);

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

export async function createGuide(req, res) {
  try {
    const userId = userIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        message: "Please log in to continue",
      });
    }

    const existing = await TravelGuide.findOne({ userId });

    if (existing) {
      return res.status(409).json({
        message: "A travel guide profile already exists",
      });
    }

    const price = Number(req.body.pricePerDay);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        message: "Please enter a valid price per day",
      });
    }

    const guide = await TravelGuide.create({
      userId,
      languages: cleanTextArray(req.body.languages, 60),
      experience: String(
        req.body.experience || ""
      ).trim(),
      pricePerDay: price,
      specialties: cleanTextArray(
        req.body.specialties,
        100
      ),
      isAvailable: req.body.isAvailable !== false,
      availabilityNote: String(
        req.body.availabilityNote || ""
      ).trim(),
      isApproved: false,
    });

    return res.status(201).json({
      message: "Travel guide profile created successfully",
      guide: await populateGuide(guide._id),
    });
  } catch (error) {
    console.error("Create travel guide error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        message: "A travel guide profile already exists",
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

export async function updateGuide(req, res) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findById(req.params.id);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide not found",
      });
    }

    const admin = isAdmin(req);

    if (
      !admin &&
      !sameId(guide.userId, userIdFromRequest(req))
    ) {
      return res.status(403).json({
        message: "You cannot update this profile",
      });
    }

    if (req.body.languages !== undefined) {
      guide.languages = cleanTextArray(
        req.body.languages,
        60
      );
    }

    if (req.body.experience !== undefined) {
      guide.experience = String(
        req.body.experience || ""
      ).trim();
    }

    if (req.body.pricePerDay !== undefined) {
      const price = Number(req.body.pricePerDay);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          message: "Please enter a valid price per day",
        });
      }

      guide.pricePerDay = price;
    }

    if (req.body.specialties !== undefined) {
      guide.specialties = cleanTextArray(
        req.body.specialties,
        100
      );
    }

    if (req.body.isAvailable !== undefined) {
      guide.isAvailable = Boolean(req.body.isAvailable);
    }

    if (admin) {
      if (req.body.isApproved !== undefined) {
        guide.isApproved = Boolean(req.body.isApproved);
      }
    } else {
      guide.isApproved = false;
    }

    await guide.save();

    return res.status(200).json({
      message: "Travel guide updated successfully",
      guide: await populateGuide(guide._id),
    });
  } catch (error) {
    console.error("Update travel guide error:", error);

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

export async function updateMyAvailability(req, res) {
  try {
    const guide = await findOwnedGuide(req);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    guide.isAvailable = req.body.isAvailable !== false;
    guide.availabilityNote = String(
      req.body.availabilityNote || ""
    ).trim();

    await guide.save();

    return res.status(200).json({
      message: "Availability updated successfully",
      guide: await populateGuide(guide._id),
    });
  } catch (error) {
    console.error("Update availability error:", error);

    return res.status(500).json({
      message: "Failed to update availability",
    });
  }
}

export async function updateMySkills(req, res) {
  try {
    const guide = await findOwnedGuide(req);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    const languages = cleanTextArray(
      req.body.languages,
      60
    );

    if (languages.length === 0) {
      return res.status(400).json({
        message: "At least one language is required",
      });
    }

    guide.languages = languages;
    guide.specialties = cleanTextArray(
      req.body.specialties,
      100
    );
    guide.isApproved = false;

    await guide.save();

    return res.status(200).json({
      message: "Languages and skills updated successfully",
      guide: await populateGuide(guide._id),
    });
  } catch (error) {
    console.error("Update skills error:", error);

    return res.status(500).json({
      message: "Failed to update languages and skills",
    });
  }
}

export async function updateMySettings(req, res) {
  try {
    const guide = await findOwnedGuide(req);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    if (req.body.pricePerDay !== undefined) {
      const nextPrice = Number(req.body.pricePerDay);

      if (!Number.isFinite(nextPrice) || nextPrice < 0) {
        return res.status(400).json({
          message: "Please enter a valid price per day",
        });
      }

      if (guide.pricePerDay !== nextPrice) {
        guide.pricePerDay = nextPrice;
        guide.isApproved = false;
      }
    }

    if (
      req.body.notificationSettings &&
      typeof req.body.notificationSettings === "object"
    ) {
      guide.notificationSettings = {
        bookingRequests:
          req.body.notificationSettings.bookingRequests !== false,
        bookingUpdates:
          req.body.notificationSettings.bookingUpdates !== false,
        reviewAlerts:
          req.body.notificationSettings.reviewAlerts !== false,
      };
    }

    await guide.save();

    return res.status(200).json({
      message: "Guide settings updated successfully",
      guide: await populateGuide(guide._id),
    });
  } catch (error) {
    console.error("Update settings error:", error);

    return res.status(500).json({
      message: "Failed to update guide settings",
    });
  }
}

export async function approveGuide(req, res) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true, runValidators: true }
    ).populate("userId", USER_FIELDS);

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

export async function rejectGuide(req, res) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findByIdAndUpdate(
      req.params.id,
      { isApproved: false },
      { new: true, runValidators: true }
    ).populate("userId", USER_FIELDS);

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

export async function deleteGuide(req, res) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findById(req.params.id);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide not found",
      });
    }

    if (
      !isAdmin(req) &&
      !sameId(guide.userId, userIdFromRequest(req))
    ) {
      return res.status(403).json({
        message: "You cannot delete this profile",
      });
    }

    await Promise.all([
      TravelGuideBooking.deleteMany({
        guideId: guide._id,
      }),
      TravelGuideReview.deleteMany({
        guideId: guide._id,
      }),
      guide.deleteOne(),
    ]);

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

export async function createGuideBooking(req, res) {
  try {
    const travelerId = userIdFromRequest(req);

    if (!travelerId) {
      return res.status(401).json({
        message: "Please log in to book a guide",
      });
    }

    if (!validId(req.params.guideId)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    const guide = await TravelGuide.findById(
      req.params.guideId
    );

    if (
      !guide ||
      !guide.isApproved ||
      !guide.isAvailable
    ) {
      return res.status(404).json({
        message: "Available travel guide not found",
      });
    }

    if (sameId(guide.userId, travelerId)) {
      return res.status(400).json({
        message: "You cannot book your own guide profile",
      });
    }

    const days = bookingDays(
      req.body.startDate,
      req.body.endDate
    );

    if (!days) {
      return res.status(400).json({
        message: "Please enter valid booking dates",
      });
    }

    const booking = await TravelGuideBooking.create({
      guideId: guide._id,
      travelerId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      numberOfDays: days,
      pricePerDay: guide.pricePerDay,
      totalAmount: guide.pricePerDay * days,
      specialRequests: String(
        req.body.specialRequests || ""
      ).trim(),
    });

    return res.status(201).json({
      message: "Guide booking request created successfully",
      booking,
    });
  } catch (error) {
    console.error("Create guide booking error:", error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create guide booking",
    });
  }
}

export async function getMyBookings(req, res) {
  try {
    const guide = await findOwnedGuide(req);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    const bookings = await TravelGuideBooking.find({
      guideId: guide._id,
    })
      .populate("travelerId", USER_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get guide bookings error:", error);

    return res.status(500).json({
      message: "Failed to fetch guide bookings",
    });
  }
}

export async function updateMyBookingStatus(req, res) {
  try {
    const guide = await findOwnedGuide(req);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    const nextStatus = String(
      req.body.status || ""
    ).toLowerCase();

    if (
      ![
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ].includes(nextStatus)
    ) {
      return res.status(400).json({
        message: "Invalid booking status",
      });
    }

    const booking = await TravelGuideBooking.findOne({
      _id: req.params.bookingId,
      guideId: guide._id,
    }).populate("travelerId", USER_FIELDS);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (
      booking.status === "pending" &&
      !["approved", "rejected"].includes(nextStatus)
    ) {
      return res.status(400).json({
        message:
          "A pending booking can only be approved or rejected",
      });
    }

    if (
      booking.status === "approved" &&
      !["completed", "cancelled"].includes(nextStatus)
    ) {
      return res.status(400).json({
        message:
          "An approved booking can only be completed or cancelled",
      });
    }

    booking.status = nextStatus;
    await booking.save();

    return res.status(200).json({
      message: "Booking status updated successfully",
      booking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);

    return res.status(500).json({
      message: "Failed to update booking status",
    });
  }
}

export async function getMyReviews(req, res) {
  try {
    const guide = await findOwnedGuide(req);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    const reviews = await TravelGuideReview.find({
      guideId: guide._id,
    })
      .populate("travelerId", USER_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json(reviews);
  } catch (error) {
    console.error("Get guide reviews error:", error);

    return res.status(500).json({
      message: "Failed to fetch guide reviews",
    });
  }
}

export async function createGuideReview(req, res) {
  try {
    const travelerId = userIdFromRequest(req);
    const rating = Number(req.body.rating);

    if (!validId(req.params.guideId)) {
      return res.status(400).json({
        message: "Invalid travel guide ID",
      });
    }

    if (
      !Number.isFinite(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    const booking = await TravelGuideBooking.findOne({
      _id: req.body.bookingId,
      guideId: req.params.guideId,
      travelerId,
      status: "completed",
    });

    if (!booking) {
      return res.status(403).json({
        message:
          "Only a traveler with a completed booking can review this guide",
      });
    }

    const review = await TravelGuideReview.create({
      guideId: req.params.guideId,
      travelerId,
      bookingId: booking._id,
      rating,
      comment: String(req.body.comment || "").trim(),
    });

    await recalculateGuideRating(req.params.guideId);

    return res.status(201).json({
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    console.error("Create guide review error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        message: "This booking has already been reviewed",
      });
    }

    return res.status(500).json({
      message: "Failed to submit guide review",
    });
  }
}

export async function getMyDashboard(req, res) {
  try {
    const guide = await TravelGuide.findOne({
      userId: userIdFromRequest(req),
    }).populate("userId", USER_FIELDS);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    const [recentBookings, recentReviews, allBookings] =
      await Promise.all([
        TravelGuideBooking.find({
          guideId: guide._id,
        })
          .populate("travelerId", USER_FIELDS)
          .sort({ createdAt: -1 })
          .limit(5),
        TravelGuideReview.find({
          guideId: guide._id,
        })
          .populate("travelerId", USER_FIELDS)
          .sort({ createdAt: -1 })
          .limit(4),
        TravelGuideBooking.find({
          guideId: guide._id,
        }),
      ]);

    return res.status(200).json({
      guide,
      bookings: recentBookings,
      reviews: recentReviews,
      summary: bookingSummary(allBookings),
    });
  } catch (error) {
    console.error("Get guide dashboard error:", error);

    return res.status(500).json({
      message: "Failed to fetch guide dashboard",
    });
  }
}

export async function getMyEarnings(req, res) {
  try {
    const guide = await findOwnedGuide(req);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    const completed = await TravelGuideBooking.find({
      guideId: guide._id,
      status: "completed",
    })
      .populate("travelerId", USER_FIELDS)
      .sort({ updatedAt: -1 });

    const monthlyMap = {};

    completed.forEach((booking) => {
      const key = monthKey(
        booking.updatedAt || booking.endDate
      );

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          month: key,
          label: monthLabel(key),
          bookings: 0,
          amount: 0,
        };
      }

      monthlyMap[key].bookings += 1;
      monthlyMap[key].amount += Number(
        booking.totalAmount || 0
      );
    });

    const totalEarnings = completed.reduce(
      (total, booking) =>
        total + Number(booking.totalAmount || 0),
      0
    );

    const paidEarnings = completed
      .filter(
        (booking) => booking.paymentStatus === "paid"
      )
      .reduce(
        (total, booking) =>
          total + Number(booking.totalAmount || 0),
        0
      );

    const transactions = completed
      .slice(0, 10)
      .map((booking) => ({
        _id: booking._id,
        travelerName:
          booking.travelerId?.name ||
          booking.travelerId?.email ||
          "Traveler",
        completedDate: new Date(
          booking.updatedAt
        ).toLocaleDateString("en-LK"),
        paymentStatus: booking.paymentStatus,
        amount: booking.totalAmount,
      }));

    return res.status(200).json({
      summary: {
        totalEarnings,
        paidEarnings,
        pendingEarnings: totalEarnings - paidEarnings,
        completedBookings: completed.length,
      },
      monthly: Object.values(monthlyMap).sort(
        (first, second) =>
          second.month.localeCompare(first.month)
      ),
      transactions,
    });
  } catch (error) {
    console.error("Get guide earnings error:", error);

    return res.status(500).json({
      message: "Failed to fetch guide earnings",
    });
  }
}

export async function getMyReports(req, res) {
  try {
    const guide = await findOwnedGuide(req);

    if (!guide) {
      return res.status(404).json({
        message: "Travel guide profile not found",
      });
    }

    const bookings = await TravelGuideBooking.find({
      guideId: guide._id,
    });

    const summary = bookingSummary(bookings);
    const monthlyMap = {};

    bookings.forEach((booking) => {
      const key = monthKey(booking.createdAt);

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          month: key,
          label: monthLabel(key),
          bookings: 0,
          earnings: 0,
        };
      }

      monthlyMap[key].bookings += 1;

      if (booking.status === "completed") {
        monthlyMap[key].earnings += Number(
          booking.totalAmount || 0
        );
      }
    });

    const completionRate =
      bookings.length === 0
        ? 0
        : (summary.completedBookings /
            bookings.length) *
          100;

    return res.status(200).json({
      summary: {
        totalBookings: summary.totalBookings,
        completionRate,
        averageRating: guide.rating,
        totalEarnings: summary.totalEarnings,
      },
      bookingStatus: {
        pending: summary.pendingBookings,
        approved: summary.approvedBookings,
        completed: summary.completedBookings,
        rejected: summary.rejectedBookings,
        cancelled: summary.cancelledBookings,
      },
      monthly: Object.values(monthlyMap).sort(
        (first, second) =>
          first.month.localeCompare(second.month)
      ),
    });
  } catch (error) {
    console.error("Get guide reports error:", error);

    return res.status(500).json({
      message: "Failed to fetch guide reports",
    });
  }
}
