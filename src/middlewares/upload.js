const multer = require('multer');
const path = require('path');

// Cấu hình Multer để lưu file vào thư mục tạm thời
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'temp/'); // Thư mục lưu trữ tạm thời
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Đặt tên file dựa trên timestamp
    }
});

// Khởi tạo Multer với cấu hình lưu file
const upload = multer({ storage });

module.exports = upload;