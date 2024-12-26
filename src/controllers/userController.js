const User = require('../models/User');
const Task = require('../models/Task');
const Action = require('../models/Action');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const path = require("path");
const fs = require("fs");
const bcrypt = require('bcrypt');
const _ = require('lodash');
const { uploadFileToFirebase } = require('../services/firebaseUploader')
const {admin} = require("../config/firebase");

exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { user_name, gmail, gender, role, is_active, password, current_password } = req.body;
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

        const hashCurrentPassword = current_password && await bcrypt.hash(current_password, 10);
        const isPasswordValid = current_password && await bcrypt.compare(current_password, user.password);
        if (password && isPasswordValid) {
            // Mã hóa mật khẩu
            const hashedPassword = await bcrypt.hash(password, 10);
            updatedData.password = hashedPassword;
        } else if (password && !isPasswordValid) {
            return res.status(401).json({
                message: 'Password is incorrect',
            });
        }

        // Cập nhật thông tin người dùng
        await user.update(updatedData);

        const updatedUser = await User.findByPk(userId);
        const sanitizedUser = _.omit(updatedUser.toJSON(), ['password']);

        // Trả về thông tin người dùng đã cập nhật
        res.status(200).json({
            message: 'User updated successfully',
            user: sanitizedUser, // Trả lại dữ liệu người dùng mới nhất
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userId = req.params.id;
        const { currentPassword, newPassword } = req.body;

        // Tìm người dùng theo ID
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Kiểm tra mật khẩu hiện tại
        const isMatch = currentPassword === user.password;
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Mã hóa mật khẩu mới
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Cập nhật mật khẩu mới
        user.password = hashedNewPassword;
        await user.save();

        // Trả về thông tin người dùng đã cập nhật (không bao gồm mật khẩu)
        const sanitizedUser = _.omit(user.toJSON(), ['password']);
        res.status(200).json({
            message: 'Password changed successfully',
            user: sanitizedUser,
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

        // Cập nhật id_lead trong bảng Project thành null nếu trùng với userId
        await Project.update(
            { id_lead: null },
            { where: { id_lead: userId } }
        );

        // Cập nhật id_receiver và id_reporter trong bảng Action thành null nếu trùng với userId
        await Action.update(
            { id_receiver: null },
            { where: { id_receiver: userId } }
        );
        await Action.update(
            { id_reporter: null },
            { where: { id_reporter: userId } }
        );

        // Cập nhật id_user trong bảng Comment thành null nếu trùng với userId
        await Comment.update(
            { id_user: null },
            { where: { id_user: userId } }
        );

        // Cập nhật id_assignee và id_reporter trong bảng Task thành null nếu trùng với userId
        await Task.update(
            { id_assignee: null },
            { where: { id_assignee: userId } }
        );
        await Task.update(
            { id_reporter: null },
            { where: { id_reporter: userId } }
        );

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
        if (user.avatar) {
            await admin.storage().bucket().file(user.avatar).delete()
        }

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
                gender: user.gender,
                role: user.role,
                is_active: user.is_active
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

exports.getListUser = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);

        const { count, rows: users } = await User.findAndCountAll({
            offset: (pageNumber - 1) * pageSize,
            limit: pageSize,
            attributes: ['id', 'user_name', 'gmail', 'avatar', 'gender', 'role', 'is_active'],
            order: [['created_at', 'DESC']],
        });

        const totalPages = Math.ceil(count / pageSize);

        res.status(200).json({
            message: 'User list retrieved successfully',
            users,
            pagination: {
                totalItems: count,
                totalPages,
                currentPage: pageNumber,
                pageSize,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve user list' });
    }
};

