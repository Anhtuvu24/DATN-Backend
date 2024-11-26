const User = require('../models/User');
const AuthenToken = require('../models/AuthenToken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

function generateRandomPassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+[]{}|;:,.<>?';

    // Bắt buộc ít nhất 1 ký tự mỗi loại
    const password = [
        chars[Math.floor(Math.random() * chars.length)], // Chữ thường
        upperChars[Math.floor(Math.random() * upperChars.length)], // Chữ hoa
        numbers[Math.floor(Math.random() * numbers.length)], // Số
        specialChars[Math.floor(Math.random() * specialChars.length)], // Ký tự đặc biệt
    ];

    // Thêm ngẫu nhiên các ký tự khác để đủ độ dài 6
    while (password.length < 6) {
        const allChars = chars + upperChars + numbers + specialChars;
        password.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    // Shuffle các ký tự để đảm bảo ngẫu nhiên
    return password.sort(() => Math.random() - 0.5).join('');
}

// Hàm gửi email
async function sendEmail(to, subject, text) {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Hoặc sử dụng SMTP server của bạn
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to,
        subject,
        text,
    });
}

exports.register = async (req, res) => {
    try {
        const { user_name, gmail, gender, role } = req.body;
        // Kiểm tra nếu email đã tồn tại
        const existingUser = await User.findOne({ where: { gmail } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const randomPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const newUser = await User.create({
            user_name,
            gmail,
            gender,
            role,
            password: hashedPassword,
        });

        // Gửi mật khẩu tới email của người dùng
        const emailSubject = 'Your Account Password';
        const emailText = `Hello ${user_name},\n\nYour account has been created successfully.\nYour password is: ${randomPassword}\n\nPlease change it after logging in.`;
        await sendEmail(gmail, emailSubject, emailText);

        // Trả về thông tin user (không bao gồm password)
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
            user,
        });
    } catch (error) {
        console.error(error);  // Log lỗi ra console để dễ dàng debug
        res.status(500).json({ error: error.message });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        console.log(req.user.id)
        const user = await User.findByPk(req.user.id, {
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
        // Kiểm tra xem refresh token có tồn tại trong cơ sở dữ liệu và chưa bị thu hồi hay không
        const tokenRecord = await AuthenToken.findOne({
            where: { refresh_token: refreshToken, revoked: false },
        });

        if (!tokenRecord) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Xác thực refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Lấy thông tin user từ ID trong refresh token
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Tạo mới access token
        const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });

        // Trả về access token mới
        res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        console.error(error);
        // Nếu token hết hạn hoặc không hợp lệ
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(403).json({ message: 'Refresh token has expired' });
        }
        res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
};