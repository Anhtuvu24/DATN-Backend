const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const CommentController = require('../controllers/commentController');

// Thêm project_type
router.post('/add', upload.none(), CommentController.addComment);

// Sửa project_type
router.put('/update/:id', upload.none(), CommentController.updateComment);

// Xóa 1 hoặc nhiều project_type
router.delete('/delete', upload.none(), CommentController.deleteComments);

router.delete('/delete/:id', upload.none(), CommentController.deleteComment);

// Lấy danh sách project_type
router.get('/list/:id_task', upload.none(), CommentController.getListCommentByTaskId);

// Lấy danh sách sprint
router.get('/:id', upload.none(), CommentController.getCommentById);

module.exports = router;