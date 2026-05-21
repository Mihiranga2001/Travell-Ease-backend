import Meadia from "../models/Media.js";

export function getMedia(req, res) {

  Media.find().then((media) => {
      res.json(media);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch media"
      });
    });
}

export function createMedia(req, res) {

  const media = new Media(req.body);

  media.save().then(() => {
      res.json({
        message: "Media uploaded successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to upload media"
      });
    });
}

export function deleteMedia(req, res) {

  const mediaId = req.params.id;

  Media.findByIdAndDelete(mediaId).then(() => {
      res.json({
        message: "Media deleted successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to delete media"
      });
    });
}