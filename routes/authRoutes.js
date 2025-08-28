// routes/authRoutes.js
const express = require("express");
const { 
  registerController, 
  loginController, 
  userDetailsController,
  updateProfileController,
  createFirstAdmin,
  getUsers,
  makeAdminUser,
  deleteUser
} = require("../controllers/authControllers.js");
const { authMiddleware, adminMiddleware } = require("../middleware/auth.js");
const { validateRegister, validateLogin } = require("../middleware/validation.js");

const router = express.Router();

// create first admin
router.post("/create-first-admin", createFirstAdmin);
// Public routes
router.post("/register", validateRegister, registerController);
router.post("/login", validateLogin, loginController);

router.use(authMiddleware); 
router.get("/user-details", userDetailsController);
router.put("/profile", updateProfileController);

router.get("/users", adminMiddleware, getUsers);
router.put('/users/:id/role', authMiddleware, makeAdminUser);
router.delete('/users/:id', authMiddleware, deleteUser)

module.exports = router;
