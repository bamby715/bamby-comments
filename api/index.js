// api/index.js - 作为入口点
export default function handler(req, res) {
  res.status(200).json({
    message: "Comments API is running",
    endpoints: {
      "GET /api/comments": "Get comments for a post",
      "POST /api/submit": "Submit a new comment"
    }
  });
}
