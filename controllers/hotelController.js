import Hotel from "../models/Hotel.js";

export function getHotels(req, res) {

  Hotel.find().then((hotels) => {
      res.json(hotels);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch hotels"
      });
    });
}

export function createHotel(req, res) {

  const hotel = new Hotel(req.body);

  hotel.save().then(() => {
      res.json({
        message: "Hotel created successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to create hotel"
      });
    });
}

export function updateHotel(req, res) {

  const hotelId = req.params.id;

  Hotel.findByIdAndUpdate(hotelId, req.body).then(() => {
      res.json({
        message: "Hotel updated successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to update hotel"
      });
    });
}

export function deleteHotel(req, res) {

  const hotelId = req.params.id;

  Hotel.findByIdAndDelete(hotelId).then(() => {
      res.json({
        message: "Hotel deleted successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to delete hotel"
      });
    });
}