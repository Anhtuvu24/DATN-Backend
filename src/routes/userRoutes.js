const express = require('express');
const User = require('../models/User');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController')

const upload = require('../middlewares/upload');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();


// Get me
router.get('/me', authController.getMe);
// Add user
router.post('/add-user', upload.none(), authController.register);
// Login
router.post('/login', upload.none(), authController.login);
// Refresh token
router.post('/refresh-token', upload.none(), authController.refreshToken);
// Get profile
router.get('/profile/:id', upload.none(), authController.getUserProfile);
// Sửa thông tin người dùng
router.put('/update-user/:id', upload.single('avatar'), userController.updateUser);
// Xóa người dùng
router.delete('/delete-user/:id', userController.deleteUser);
// upload avatar
router.post('/upload-avatar', upload.single('avatar'), userController.uploadAvatar);

// lấy avatar
router.get('/get-avatar/:id', userController.getAvatar);

// Lấy danh sách user
router.get('/get-users', userController.getListUser);


module.exports = router;
