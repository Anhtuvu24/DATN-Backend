const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const projectTypeController = require('../controllers/projectTypeController');

// Thêm project_type
router.post('/add', upload.none(), projectTypeController.addProjectType);

// Sửa project_type
router.put('/update', upload.none(), projectTypeController.updateProjectType);

// Xóa 1 hoặc nhiều project_type
router.delete('/delete', upload.none(), projectTypeController.deleteProjectTypes);

// Lấy danh sách project_type
router.get('/list', upload.none(), projectTypeController.getProjectTypes);

module.exports = router;
