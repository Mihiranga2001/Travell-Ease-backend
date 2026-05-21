import Vehicle from "../models/Vehicle.js";

export function getVehicles(req, res) {

  Vehicle.find().then((vehicles) => {
      res.json(vehicles);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch vehicles"
      });
    });
}

export function createVehicle(req, res) {

  const vehicle = new Vehicle(req.body);

  vehicle.save().then(() => {
      res.json({
        message: "Vehicle created successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to create vehicle"
      });
    });
}

export function updateVehicle(req, res) {

  const vehicleId = req.params.id;

  Vehicle.findByIdAndUpdate(vehicleId, req.body).then(() => {
      res.json({
        message: "Vehicle updated successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to update vehicle"
      });
    });
}

export function deleteVehicle(req, res) {

  const vehicleId = req.params.id;

  Vehicle.findByIdAndDelete(vehicleId).then(() => {
      res.json({
        message: "Vehicle deleted successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to delete vehicle"
      });
    });
}