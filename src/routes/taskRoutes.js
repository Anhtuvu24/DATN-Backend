const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const TaskController = require('../controllers/taskController');

// Thêm project_type
router.post('/add', upload.none(), TaskController.addTask);

// Sửa project_type
router.put('/update/:id', upload.none(), TaskController.updateTask);

// Xóa 1 hoặc nhiều project_type
router.delete('/delete', upload.none(), TaskController.deleteTasks);

// Lấy danh sách project_type
router.get('/list/:id_sprint', upload.none(), TaskController.getTasks);

// Lấy danh sách sprint
router.get('/:id', upload.none(), TaskController.getTask);

module.exports = router;