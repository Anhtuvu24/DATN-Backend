const jwt = require('jsonwebtoken');
const axios = require('axios');

exports.authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy token từ Bearer

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.decode(token); // Giải mã token để lấy thông tin

        if (decoded && decoded.exp) {
            const expirationTime = decoded.exp * 1000; // Chuyển từ giây sang mili giây
            const currentTime = Date.now();

            if (expirationTime < currentTime) {
                // Nếu token hết hạn, gọi API refresh token
                const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
                if (!refreshToken) {
                    return res.status(401).json({ message: 'Refresh token required' });
                }

                try {
                    const response = await axios.post('http://localhost:3001/api/users/refresh-token', { refreshToken });
                    const newAccessToken = response.data.accessToken;

                    // Lưu lại access token mới vào header hoặc vào cookie
                    res.setHeader('Authorization', `Bearer ${newAccessToken}`);

                    // Tiếp tục xử lý request với access token mới
                    req.user = jwt.verify(newAccessToken, process.env.JWT_SECRET);  // Đảm bảo token hợp lệ
                    next();
                } catch (error) {
                    return res.status(403).json({ message: 'Invalid or expired refresh token' });
                }
            } else {
                // Nếu token chưa hết hạn, xác thực bình thường
                const verified = jwt.verify(token, process.env.JWT_SECRET);
                req.user = verified;
                next();
            }
        } else {
            return res.status(400).json({ message: 'Invalid token structure' });
        }
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};
