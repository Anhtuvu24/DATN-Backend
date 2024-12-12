const User = require('../models/User');
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
async function sendEmail(to, subject, userName, password) {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Hoặc sử dụng SMTP server khác
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // Nội dung email HTML
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2 style="color: #333;">Hello ${userName},</h2>
            <p>Welcome to our platform! Your account has been successfully created.</p>
            <p>Below is your password. Please change it after logging in:</p>
            <div style="background: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                <p style="font-size: 18px; margin: 0;">Password: <strong id="password">${password}</strong></p>
                <button style="margin-top: 10px; padding: 8px 12px; background: #007bff; color: #fff; border: none; border-radius: 3px; cursor: pointer;" 
                    onclick="navigator.clipboard.writeText('${password}')">Copy Password</button>
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
        await sendEmail(gmail, emailSubject, user_name, randomPassword);

        // Trả về thông tin user (ẩn password)
        res.status(201).json({
            message: 'User created successfully and password sent to email.',
            user: {
                id: newUser.id,
                user_name: newUser.user_name,
                gmail: newUser.gmail,
                gender: newUser.gender,
                role: newUser.role,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user.' });
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

        // Kiểm tra mật khẩu
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Tạo access token và refresh token
        const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1m' });
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
        const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
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
                // Token hết hạn, sử dụng refresh token
                const refreshToken = req.headers['x-refresh-token'];
                if (!refreshToken) {
                    return res.status(401).json({ message: 'Refresh token required' });
                }
                try {
                    // Gọi API refresh token
                    const response = await axios.post('http://localhost:3001/api/users/refresh-token', { refreshToken });
                    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

                    // Cập nhật access token và refresh token mới vào header
                    res.setHeader('Authorization', `Bearer ${newAccessToken}`);
                    res.setHeader('x-refresh-token', newRefreshToken);

                    // Xác thực lại với token mới
                    const verified = jwt.verify(newAccessToken, process.env.JWT_SECRET);

                    // Lấy thông tin user
                    const user = await User.findByPk(verified.id, {
                        attributes: ['id', 'user_name', 'gmail', 'gender', 'avatar', 'role', 'is_active'],
                    });

                    if (!user) {
                        return res.status(404).json({ message: 'User not found' });
                    }

                    return res.status(200).json({
                        message: 'User retrieved successfully (refreshed token)',
                        user,
                        newAccessToken,
                        newRefreshToken
                    });
                } catch (error) {
                    console.error(error);
                    return res.status(403).json({ message: 'Invalid or expired refresh token' });
                }
            } else {
                // Token còn hiệu lực
                const verified = jwt.verify(token, process.env.JWT_SECRET);

                const user = await User.findByPk(verified.id, {
                    attributes: ['id', 'user_name', 'gmail', 'gender', 'avatar', 'role', 'is_active'],
                });

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                return res.status(200).json({
                    message: 'User retrieved successfully',
                    user,
                });
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
