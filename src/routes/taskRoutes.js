const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const TaskController = require('../controllers/taskController');

// Thêm project_type
router.post('/add', upload.array('files'), TaskController.addTask);

// Sửa project_type
router.put('/update/:id', upload.none(), TaskController.updateTask);

// Update index, status
router.put('/update-order', upload.none(), TaskController.updateOrder);

// Xóa 1 hoặc nhiều project_type
router.delete('/delete/:id', upload.none(), TaskController.deleteTask);

// Lấy danh sách project_type
router.get('/list/:id_sprint', upload.none(), TaskController.getTasks);

router.get('/tasks/:sprintId', upload.none(), TaskController.getTasksGroupedByStatus);

router.get('/search-tasks', upload.none(), TaskController.searchTasks);

// Lấy danh sách sprint
router.get('/:id', upload.none(), TaskController.getTask);

module.exports = router;