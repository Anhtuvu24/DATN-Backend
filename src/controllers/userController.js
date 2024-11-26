const User = require('../models/User');
const path = require("path");
const fs = require("fs");
const { uploadFileToFirebase } = require('../services/firebaseUploader')

exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { user_name, gmail, gender, role, is_active } = req.body;
        const avatar = req.file ? req.file.path : null;  // Lấy ảnh mới nếu có

        // Tìm người dùng theo ID
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Tạo đối tượng cập nhật với các trường chỉ khi có giá trị
        const updatedData = {};
        if (user_name) updatedData.user_name = user_name;
        if (gmail) updatedData.gmail = gmail;
        if (gender) updatedData.gender = gender;
        if (role) updatedData.role = role;
        if (is_active !== undefined) updatedData.is_active = is_active;
        if (avatar) updatedData.avatar = avatar;

        // Cập nhật thông tin người dùng
        await user.update(updatedData);

        // Trả về thông tin người dùng đã cập nhật
        res.status(200).json({
            message: 'User updated successfully',
            user: await User.findByPk(userId), // Trả lại dữ liệu người dùng mới nhất
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Tìm người dùng theo ID
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Xóa người dùng
        await user.destroy();

        res.status(200).json({
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.uploadAvatar = async (req, res) => {
    try {
        const userId = req.body.userId;  // Lấy userId từ form-data
        const file = req.file; // Lấy đường dẫn file đã upload

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Tạo đường dẫn đích trên Firebase
        const destination = `avatars/${Date.now()}-${file.originalname}`;

        // Tải file lên Firebase Storage
        const fileUrl = await uploadFileToFirebase(file.path, destination, file.mimetype);

        // Cập nhật đường dẫn avatar trong cơ sở dữ liệu
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Cập nhật avatar trong database
        user.avatar = fileUrl;
        await user.save();

        // Trả về thông tin người dùng đã cập nhật
        res.status(200).json({
            message: 'Avatar uploaded successfully',
            user: {
                id: user.id,
                user_name: user.user_name,
                gmail: user.gmail,
                avatar: user.avatar,  // Trả về đường dẫn ảnh
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to upload avatar' });
    }
};

exports.getAvatar = async (req, res) => {
    try {
        const userId = req.params.id;

        // Lấy đường dẫn avatar từ database
        const user = await User.findByPk(userId, {
            attributes: ['avatar'], // Chỉ lấy cột avatar
        });

        if (!user || !user.avatar) {
            return res.status(404).json({ message: 'Avatar not found' });
        }

        // Trả về URL ảnh từ Firebase
        res.status(200).json({
            message: 'Avatar retrieved successfully',
            avatarUrl: user.avatar, // URL đã lưu trên Firebase Storage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve avatar' });
    }
};