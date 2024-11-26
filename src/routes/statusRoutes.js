const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const statusController = require('../controllers/statusController');

// Thêm project_type
router.post('/add', upload.none(), statusController.addStatus);

// Sửa project_type
router.put('/update', upload.none(), statusController.updateStatus);

// Xóa 1 hoặc nhiều project_type
router.delete('/delete', upload.none(), statusController.deleteStatuses);

// Lấy danh sách project_type
router.get('/list', upload.none(), statusController.getStatuses);

module.exports = router;
