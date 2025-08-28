// controllers/blogController.js
const Blog = require('../modals/Blog.js');
const mongoose = require('mongoose');
const User = require('../modals/User');

// @desc    Get all blogs (public)
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const author = req.query.author || ''; // Add this line
    const category = req.query.category || '';
    const tag = req.query.tag || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    // Build query
    let query = {};
    
    // Only show published blogs for public access
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'published';
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filter by author name - Add this block
    if (author) {
      const authorUsers = await User.find({ 
        name: { $regex: author, $options: 'i' } 
      }).select('_id');
      console.log("authorUsers", authorUsers)
      const authorIds = authorUsers.map(user => user._id);
      query.author = { $in: authorIds };
    }

    // Filter by category
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    // Filter by tag
    if (tag) {
      query.tags = { $in: [new RegExp(tag, 'i')] };
    }

    // Execute query
    const blogs = await Blog.find(query)
      .populate('author', 'name email avatar')
      .select('-comments')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: page,
          totalPages,
          totalBlogs: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs'
    });
  }
};

// @desc    Get single blog
// @route   GET /api/blogs/:id or /api/blogs/public/:slug
// @access  Public
const getBlog = async (req, res) => {
  try {
    const { id, slug } = req.params;
    let blog;

    if (slug) {
      // Get by slug - handle both public and protected routes
      blog = await Blog.findOne({ slug })
        .populate('author', 'name email avatar bio')
        .populate('comments.user', 'name avatar');
      
      // Check if this is a public route (check the actual route path)
      const isPublicRoute = req.route.path === '/public/:slug';
      
      if (isPublicRoute) {
        // Public route - only show published blogs
        if (!blog || blog.status !== 'published') {
          return res.status(404).json({
            success: false,
            message: 'Blog not found'
          });
        }
      } else {
        // Protected route - check authorization for non-published blogs
        if (blog && blog.status !== 'published') {
          // Check if user is authenticated
          if (!req.user) {
            return res.status(401).json({
              success: false,
              message: 'Authentication required'
            });
          }
          
          // Check if user is admin or author
          if (req.user.role !== 'admin' && blog.author._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
              success: false,
              message: 'Access denied'
            });
          }
        }
      }
    } else if (id) {
      // Get by ID (protected route)
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid blog ID'
        });
      }

      blog = await Blog.findById(id)
        .populate('author', 'name email avatar bio')
        .populate('comments.user', 'name avatar');

      // Check if user can access this blog
      if (blog && blog.status !== 'published') {
        if (!req.user || (req.user.role !== 'admin' && blog.author._id.toString() !== req.user._id.toString())) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }
    }

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Increment view count for published blogs only
    if (blog.status === 'published') {
      await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });
    }

    res.json({
      success: true,
      data: { blog }
    });
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog'
    });
  }
};


// @desc    Create new blog
// @route   POST /api/blogs
// @access  Private
const createBlog = async (req, res) => {
  try {
    const { title, content, status, tags, category, excerpt } = req.body;

    const blog = await Blog.create({
      title,
      content,
      excerpt,
      author: req.user._id,
      status: status || 'draft',
      tags: tags || [],
      category: category || 'General',
      
    });

    const populatedBlog = await Blog.findById(blog._id).populate('author', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: { blog: populatedBlog }
    });
  } catch (error) {
    console.error('Create blog error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Blog with this title already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating blog'
    });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blog ID'
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Check if user owns the blog or is admin
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this blog'
      });
    }

    const allowedUpdates = ['title', 'content', 'status', 'tags', 'category', 'excerpt'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedBlog = await Blog.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    }).populate('author', 'name email avatar');

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: { blog: updatedBlog }
    });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating blog'
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blog ID'
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin can delete any blog
    if (req.user.role === 'admin') {
      await Blog.findByIdAndDelete(id);
      return res.json({
        success: true,
        message: 'Blog deleted successfully by admin'
      });
    }

    // Author can delete their own blog
    if (blog.author.toString() === req.user._id.toString()) {
      await Blog.findByIdAndDelete(id);
      return res.json({
        success: true,
        message: 'Blog deleted successfully'
      });
    }

    // Otherwise, user is not authorized
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this blog'
    });

  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting blog'
    });
  }
};

// @desc    Get user's blogs
// @route   GET /api/blogs/my-blogs
// @access  Private
const getUserBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';

    let query = { author: req.user._id };

    if (status) {
      query.status = status;
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name email avatar')
      .select('-comments')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: page,
          totalPages,
          totalBlogs: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user blogs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user blogs'
    });
  }
};

// @desc    Toggle blog status (admin only)
// @route   PUT /api/blogs/admin/:id/status
// @access  Private (Admin)
const toggleBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blog ID'
      });
    }

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be draft, published, or archived'
      });
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('author', 'name email avatar');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog status updated successfully',
      data: { blog }
    });
  } catch (error) {
    console.error('Toggle blog status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating blog status'
    });
  }
};

// @desc    Add comment to blog
// @route   POST /api/blogs/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blog ID'
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    if (blog.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot comment on unpublished blog'
      });
    }

    blog.comments.push({
      user: req.user._id,
      content
    });

    await blog.save();

    const updatedBlog = await Blog.findById(id)
      .populate('comments.user', 'name avatar')
      .select('comments');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comments: updatedBlog.comments }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
};

// @desc    Like/Unlike blog
// @route   POST /api/blogs/:id/like
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blog ID'
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const existingLike = blog.likes.find(like => like.user.toString() === req.user._id.toString());

    if (existingLike) {
      // Unlike
      blog.likes = blog.likes.filter(like => like.user.toString() !== req.user._id.toString());
    } else {
      // Like
      blog.likes.push({ user: req.user._id });
    }

    await blog.save();

    res.json({
      success: true,
      message: existingLike ? 'Blog unliked' : 'Blog liked',
      data: { 
        liked: !existingLike,
        likeCount: blog.likes.length 
      }
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling like'
    });
  }
};

module.exports = {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getUserBlogs,
  toggleBlogStatus,
  addComment,
  toggleLike
};
