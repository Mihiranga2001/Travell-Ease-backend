import Review from "../models/Review.js";

export function getReviews(req, res) { 

    Review.find().then((reviews) => {
      res.json(reviews);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch reviews"
      });
    });
}

export function createReview(req, res) {

  const review = new Review(req.body);

  review.save().then(() => {
      res.json({
        message: "Review added successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to add review"
      });
    });
}

export function updateReview(req, res) {

  const reviewId = req.params.id;

  Review.findByIdAndUpdate(reviewId, req.body).then(() => {
      res.json({
        message: "Review updated successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to update review"
      });
    });
}

export function deleteReview(req, res) {

  const reviewId = req.params.id;

  Review.findByIdAndDelete(reviewId).then(() => {
      res.json({
        message: "Review deleted successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to delete review"
      });
    });
}