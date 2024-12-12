const File = require('../models/File');
const { admin } = require('../config/firebase');
const { uploadFileToFirebase } = require('../services/firebaseUploader');
const path = require('path');
const multer = require('multer');

// Cấu hình multer để xử lý file upload
const upload = multer({ dest: 'uploads/' }); // Lưu file tạm vào thư mục 'uploads/'

const FileController = {
    // Upload file và lưu thông tin vào database
    uploadFiles: async (req, res) => {
        const { id_task } = req.body;

        if (!id_task) {
            return res.status(400).json({ error: 'Task ID is required' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        try {
            const uploadedFiles = [];

            for (const file of req.files) {
                const tempFilePath = file.path;
                const destination = `files/${id_task}/${file.filename}`;
                const mimetype = file.mimetype;

                // Upload file lên Firebase Storage
                const fileUrl = await uploadFileToFirebase(tempFilePath, destination, mimetype);

                // Lưu thông tin file vào database
                const newFile = await File.create({
                    url: fileUrl,
                    name: file.originalname,
                    id_task,
                    size: file.size,
                    mimetype,
                });

                uploadedFiles.push(newFile);
            }

            res.status(201).json({
                message: 'Files uploaded successfully',
                uploadedFiles,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to upload files' });
        }
    },

    // Xóa file (nhiều file cùng lúc)
    deleteFiles: async (req, res) => {
        let { ids } = req.body;

        if (typeof ids === 'string') {
            try {
                ids = JSON.parse(ids);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid JSON format for ids' });
            }
        }

        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        try {
            // Lấy danh sách các file từ database
            const files = await File.findAll({ where: { id: ids } });

            if (!files.length) {
                return res.status(404).json({ message: 'Files not found' });
            }

            // Xóa file trên Firebase Storage
            const deletedIds = [];
            const firebaseDeletePromises = files.map(async (file) => {
                const filePath = file.url; // Sử dụng trực tiếp đường dẫn từ database

                try {
                    await admin.storage().bucket().file(filePath).delete();
                    console.log(`Deleted file from Firebase: ${filePath}`);
                    deletedIds.push(file.id);
                } catch (err) {
                    console.error(`Failed to delete file from Firebase: ${filePath}`, err);
                    throw new Error(`Failed to delete file: ${file.name}`);
                }
            });

            // Chờ tất cả các file được xóa khỏi Firebase
            await Promise.all(firebaseDeletePromises);

            // Xóa file trong database
            await File.destroy({ where: { id: deletedIds } });

            res.status(200).json({
                message: 'Files deleted successfully',
                deletedIds
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete files' });
        }
    },

    deleteFile: async (req, res) => {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'File ID is required' });
        }

        try {
            // Tìm file trong database
            const file = await File.findOne({ where: { id } });

            if (!file) {
                return res.status(404).json({ message: 'File not found' });
            }

            // Xóa file trên Firebase Storage
            const filePath = file.url; // Sử dụng trực tiếp đường dẫn từ database

            try {
                await admin.storage().bucket().file(filePath).delete();
                console.log(`Deleted file from Firebase: ${filePath}`);
            } catch (err) {
                console.error(`Failed to delete file from Firebase: ${filePath}`, err);
                throw new Error(`Failed to delete file: ${file.name}`);
            }

            // Xóa file trong database
            await File.destroy({ where: { id } });

            res.status(200).json({
                message: 'File deleted successfully',
                deletedId: id
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete file' });
        }
    },

    // Lấy danh sách file theo id_task
    getFilesByTask: async (req, res) => {
        const { id_task } = req.params;

        try {
            const files = await File.findAll({ where: { id_task } });
            res.status(200).json({ data: files });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch files' });
        }
    },
};

module.exports = { FileController, upload };
