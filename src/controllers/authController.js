const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const AuthenToken = require('../models/AuthenToken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const axios = require('axios');

function generateRandomPassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+[]{}|;:,.<>?';

    // Đảm bảo ít nhất 1 ký tự mỗi loại
    const password = [
        chars[Math.floor(Math.random() * chars.length)], // Chữ thường
        upperChars[Math.floor(Math.random() * upperChars.length)], // Chữ hoa
        numbers[Math.floor(Math.random() * numbers.length)], // Số
        specialChars[Math.floor(Math.random() * specialChars.length)], // Ký tự đặc biệt
    ];

    // Thêm các ký tự ngẫu nhiên khác để đủ độ dài 10
    while (password.length < 10) {
        const allChars = chars + upperChars + numbers + specialChars;
        password.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    // Xáo trộn để đảm bảo ngẫu nhiên
    return password.sort(() => Math.random() - 0.5).join('');
}

// Hàm gửi email với kiểu cách đẹp
async function sendEmail(to, subject, userName, userId, password) {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Hoặc sử dụng SMTP server khác
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
    const href = `http://localhost:5173/change-password?userId=${userId}&password=${password}`;
    // Nội dung email HTML
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2 style="color: #333;">Hello ${userName},</h2>
            <p>Welcome to our platform! Your account has been successfully created.</p>
            <p>Below is your password. Please change it after logging in:</p>
            <div style="background: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                <a href="${href}" 
                    rel="noopener noreferrer"
                    style="margin-top: 10px; padding: 8px 12px; background: #007bff; color: #fff; border: none; border-radius: 3px; cursor: pointer;text-decoration: unset"
                    target="_blank"
                    data-saferedirecturl=""
                >
                 CHANGE PASSWORD
                </a>
            </div>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Thank you,<br>The Team</p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to,
        subject,
        html: emailHtml,
    });
}

exports.register = async (req, res) => {
    try {
        const { user_name, gmail, gender, role } = req.body;

        // Kiểm tra email đã tồn tại
        const existingUser = await User.findOne({ where: { gmail } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Tạo mật khẩu ngẫu nhiên và hash
        const randomPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        // Tạo user mới
        const newUser = await User.create({
            user_name,
            gmail,
            gender,
            role,
            password: hashedPassword,
        });

        // Gửi email
        const emailSubject = 'Welcome! Your Account Password';
        await sendEmail(gmail, emailSubject, user_name, newUser.id, hashedPassword);

        // Trả về thông tin user (ẩn password)
        res.status(201).json({
            message: 'User created successfully and password sent to email.',
            user: newUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user.' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { gmail } = req.body;

        // Check if the email exists
        const user = await User.findOne({ where: { gmail } });
        if (!user) {
            return res.status(404).json({ message: 'Email not found' });
        }

        // Generate a new random password and hash it
        const newPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        user.password = hashedPassword;
        await user.save();

        // Send the new password to the user's email
        const emailSubject = 'Password Reset Request';
        await sendEmail(gmail, emailSubject, user.user_name, user.id, hashedPassword);

        res.status(200).json({ message: 'New password sent to your email' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

exports.login = async (req, res) => {
    try {
        // Lấy gmail và password từ req.body
        const { gmail, password } = req.body;
        // Kiểm tra xem có tồn tại gmail và password trong body không
        if (!gmail || !password) {
            return res.status(400).json({ message: 'Gmail and password are required' });
        }

        // Kiểm tra user
        const user = await User.findOne({ where: { gmail } });
        const { password: _password, ..._user } = user?.toJSON();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.is_active) {
            return res.status(401).json({ message: 'Account has been disabled' });
        }

        // Kiểm tra mật khẩu
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Tạo access token và refresh token
        const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

        // Lưu refresh token vào database
        await AuthenToken.create({
            user_id: user.id,
            refresh_token: refreshToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        res.status(200).json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: _user,
        });
    } catch (error) {
        console.error(error);  // Log lỗi ra console để dễ dàng debug
        res.status(500).json({ message: 'System error' });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId, {
            attributes: ['id', 'user_name', 'gmail', 'gender', 'avatar', 'role', 'is_active'],
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }
    try {
        // Kiểm tra xem refresh token có tồn tại và chưa bị thu hồi
        const tokenRecord = await AuthenToken.findOne({
            where: { refresh_token: refreshToken, revoked: false },
        });
        if (!tokenRecord) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Xác thực refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Tìm user từ ID trong refresh token
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Tạo mới access token và refresh token
        const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const newRefreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

        // Cập nhật refresh token mới trong cơ sở dữ liệu
        await AuthenToken.update(
            { refresh_token: newRefreshToken },
            { where: { refresh_token: refreshToken } }
        );

        // Trả về access token và refresh token mới
        return res.status(200).json({
            message: 'Token refreshed successfully',
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error(error);
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(403).json({ message: 'Refresh token has expired' });
        }
        return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
};

exports.logout = async (req, res) => {
    try {
        // Lấy refresh token từ body hoặc header
        const refreshToken = req.headers['x-refresh-token'];

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        // Xóa refresh token khỏi database
        const deleted = await AuthenToken.destroy({
            where: { refresh_token: refreshToken },
        });

        if (!deleted) {
            return res.status(404).json({ message: 'Refresh token not found' });
        }

        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error(error); // Log lỗi để debug
        res.status(500).json({ message: 'System error' });
    }
};

exports.getMe = async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy token từ Bearer
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.decode(token);

        if (decoded && decoded.exp) {
            const expirationTime = decoded.exp * 1000;
            const currentTime = Date.now();

            if (expirationTime < currentTime) {
                // Token hết hạn, xử lý refresh token
                const refreshToken = req.headers['x-refresh-token'];
                if (!refreshToken) {
                    return res.status(401).json({ message: 'Refresh token required' });
                }
                try {
                    const response = await axios.post('http://localhost:3001/api/users/refresh-token', { refreshToken });
                    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

                    res.setHeader('Authorization', `Bearer ${newAccessToken}`);
                    res.setHeader('x-refresh-token', newRefreshToken);

                    // Xác thực lại với token mới
                    const verified = jwt.verify(newAccessToken, process.env.JWT_SECRET);

                    return await fetchUserDetails(verified.id, res, true, newAccessToken, newRefreshToken);
                } catch (error) {
                    console.error(error);
                    return res.status(403).json({ message: 'Invalid or expired refresh token' });
                }
            } else {
                // Token còn hiệu lực
                const verified = jwt.verify(token, process.env.JWT_SECRET);

                return await fetchUserDetails(verified.id, res);
            }
        } else {
            return res.status(400).json({ message: 'Invalid token structure' });
        }
    } catch (error) {
        console.error('Error occurred:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Access token expired' });
        }

        if (error.response) {
            console.error('Refresh token API error:', error.response.data);
            return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }

        return res.status(403).json({ message: 'Invalid or expired token', error: error.message });
    }
};

async function fetchUserDetails(userId, res, isRefreshed = false, newAccessToken = null, newRefreshToken = null) {
    try {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'user_name', 'gmail', 'gender', 'avatar', 'role', 'is_active'],
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Lấy danh sách task của user trong các sprint đang mở
        const tasks = await Task.findAll({
            where: { id_assignee: user.id },
            include: [
                {
                    model: Sprint,
                    as: 'sprint',
                    where: { is_close: false },
                    attributes: ['id', 'name', 'start_date', 'end_date', 'is_close', 'id_project'],
                },
            ],
            attributes: ['id', 'name', 'description', 'id_status', 'priority'],
        });

        // Lấy danh sách project chứa các sprint và task đang làm
        const projectIds = [...new Set(tasks.map(task => task.sprint.id_project))];
        const projects = await Project.findAll({
            where: { id: projectIds },
            include: [
                {
                    model: Sprint,
                    as: 'sprint',
                    where: { is_close: false },
                    include: [
                        {
                            model: Task,
                            as: 'tasks',
                            attributes: ['id', 'name', 'id_status', 'priority'],
                        },
                    ],
                },
            ],
            attributes: ['id', 'name', 'icon'],
        });

        return res.status(200).json({
            message: `User retrieved successfully${isRefreshed ? ' (refreshed token)' : ''}`,
            user,
            tasks,
            projects,
            ...(isRefreshed && { newAccessToken, newRefreshToken }),
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        return res.status(500).json({ message: 'Failed to fetch user details', error: error.message });
    }
}

