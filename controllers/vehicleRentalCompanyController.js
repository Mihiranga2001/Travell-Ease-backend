import VehicleRentalCompany from "../models/VehicleRentalCompany.js";

export function getVehicleRentalCompanies(req, res) {
  VehicleRentalCompany.find()
    .then((companies) => {
      res.json(companies);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch vehicle rental companies"
      });
    });
}

export function createVehicleRentalCompany(req, res) {
  const company = new VehicleRentalCompany(req.body);

  company.save()
    .then(() => {
      res.json({
        message: "Vehicle rental company created successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to create vehicle rental company"
      });
    });
}

export function updateVehicleRentalCompany(req, res) {
  const companyId = req.params.id;

  VehicleRentalCompany.findByIdAndUpdate(companyId, req.body)
    .then(() => {
      res.json({
        message: "Vehicle rental company updated successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to update vehicle rental company"
      });
    });
}

export function deleteVehicleRentalCompany(req, res) {
  const companyId = req.params.id;

  VehicleRentalCompany.findByIdAndDelete(companyId)
    .then(() => {
      res.json({
        message: "Vehicle rental company deleted successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to delete vehicle rental company"
      });
    });
}