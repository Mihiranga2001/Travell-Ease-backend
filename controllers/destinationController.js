import Destination from "../models/Destination.js";

export function getDestinations(req, res) {

  Destination.find().then((destinations) => {
      res.json(destinations);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch destinations"
      });
    })
}

export function createDestination(req, res) {

  const destination = new Destination(req.body);

  destination.save().then(() => {
      res.json({
        message: "Destination created successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to create destination"
      });
    });
}

export function updateDestination(req, res) {

  const destinationId = req.params.id;

  Destination.findByIdAndUpdate(destinationId, req.body).then(() => {
      res.json({
        message: "Destination updated successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to update destination"
      });
    });
}

export function deleteDestination(req, res) {

  const destinationId = req.params.id;

  Destination.findByIdAndDelete(destinationId).then(() => {
      res.json({
        message: "Destination deleted successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to delete destination"
      });
    });
}