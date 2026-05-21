import Booking from "../models/Booking.js";

export function getBookings(req, res) {

  Booking.find().then((bookings) => {
      res.json(bookings);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch bookings"
      });
    });
}

export function createBooking(req, res) {

  const booking = new Booking(req.body);

  booking.save().then(() => {
      res.json({
        message: "Booking created successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to create booking"
      });
    });
}

export function updateBooking(req, res) {

  const bookingId = req.params.id;

  Booking.findByIdAndUpdate(bookingId, req.body).then(() => {
      res.json({
        message: "Booking updated successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to update booking"
      });
    });
}

export function deleteBooking(req, res) {

  const bookingId = req.params.id;

  Booking.findByIdAndDelete(bookingId).then(() => {
      res.json({
        message: "Booking deleted successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to delete booking"
      });
    });
}