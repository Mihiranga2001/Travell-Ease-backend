import Post from "../models/Post.js";

export function getPosts(req, res) {

  Post.find().then((posts) => {
      res.json(posts);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch posts"
      });
    });
}

export function createPost(req, res) {

  const post = new Post(req.body);

  post.save().then(() => {
      res.json({
        message: "Post created successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to create post"
      });
    });
}

export function deletePost(req, res) {

  const postId = req.params.id;

  Post.findByIdAndDelete(postId).then(() => {
      res.json({
        message: "Post deleted successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to delete post"
      });
    });
}