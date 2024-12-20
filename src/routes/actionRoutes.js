// routes/actionRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const {
    createAction,
    updateAction,
    deleteAction,
    getActionsByReceiver,
    getActionsByTask
} = require('../controllers/actionController');

// Tạo mới action
router.post('/add', upload.none(), createAction);

// Cập nhật action
router.put('/update/:id', upload.none(), updateAction);

// Xóa action (1 hoặc nhiều)
router.delete('/delete', upload.none(), deleteAction);

// Lấy danh sách action theo id_user_receiver
router.get('/list/:id_user_receiver', upload.none(), getActionsByReceiver);

router.get('/list-by-task/:id_task', upload.none(), getActionsByTask);

module.exports = router;
