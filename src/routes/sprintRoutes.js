const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const sprintController = require('../controllers/sprintController')

// Thêm project_type
router.post('/add', upload.none(), sprintController.addSprint);

// Sửa project_type
router.put('/update/:id', upload.none(), sprintController.updateSprint);

// Xóa 1 hoặc nhiều project_type
router.delete('/delete', upload.none(), sprintController.deleteSprint);

// Lấy danh sách project_type
router.get('/list', upload.none(), sprintController.getSprints);

// Lấy danh sách sprint
router.get('/:id', upload.none(), sprintController.getSprint);

module.exports = router;