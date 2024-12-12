const express = require('express');
const router = express.Router();
const { FileController, upload } = require('../controllers/FileController');

// API upload file
router.post('/upload', upload.array('files'), FileController.uploadFiles);

// API xóa file
router.delete('/delete-files', FileController.deleteFiles);

router.delete('/delete/:id', FileController.deleteFile);

// API lấy danh sách file theo id_task
router.get('/list/:id_task', FileController.getFilesByTask);

module.exports = router;
