import TravelGuide from "../models/TravelGuide.js";

export function getGuides(req, res) {

  TravelGuide.find().then((guides) => {
      res.json(guides);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch guides"
      });
    });
}

export function createGuide(req, res) {

  const guide = new TravelGuide(req.body);

  guide.save().then(() => {
      res.json({
        message: "Guide created successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to create guide"
      });
    });
}

export function updateGuide(req, res) {

  const guideId = req.params.id;

  TravelGuide.findByIdAndUpdate(guideId, req.body).then(() => {
      res.json({
        message: "Guide updated successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to update guide"
      });
    });
}

export function deleteGuide(req, res) {
  const guideId = req.params.id;

  TravelGuide.findByIdAndDelete(guideId).then(() => {
      res.json({
        message: "Guide deleted successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to delete guide"
      });
    });
}