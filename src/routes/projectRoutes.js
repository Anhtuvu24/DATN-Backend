const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const projectController = require('../controllers/projectController');

// Thêm project_type
router.post('/add', upload.single('icon'), projectController.createProject);

// Sửa project_type
router.put('/update/:id', upload.single('icon'), projectController.updateProject);

// Xóa 1 hoặc nhiều project_type
router.delete('/delete', upload.none(), projectController.deleteProject);

// Lấy danh sách project_type
router.get('/list', upload.none(), projectController.getProjects);

// Lấy project theo ID
router.get('/:id', upload.none(), projectController.getProjectById);

module.exports = router;
