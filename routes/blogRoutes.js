// routes/blogRoutes.js (Updated)
const express = require("express");
const {
  createBlog,
  updateBlog,
  deleteBlog,
  getBlog,
  getBlogs,
  getUserBlogs,
  addComment,
  toggleLike,
} = require("../controllers/blogControllers.js");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.js");
const { validateBlog } = require("../middleware/validation.js");

const router = express.Router();

// Public routes
router.get("/", getBlogs);
router.get("/public/:slug", getBlog);

// Protected routes
router.use(authMiddleware);
router.post("/", validateBlog, createBlog);
router.get("/my-blogs", getUserBlogs);
router.get("/:slug", authMiddleware, getBlog);
router.put("/:id", validateBlog, updateBlog);
router.delete("/:id", deleteBlog);
router.post("/:id/comments", addComment);
router.post("/:id/like", toggleLike);

// Admin routes
router.use(adminMiddleware);
module.exports = router;
