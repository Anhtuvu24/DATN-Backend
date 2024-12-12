const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { bucket } = require('../config/firebase')

/**
 * Tải file lên Firebase Storage
 * @param {string} tempFilePath - Đường dẫn file tạm trên server
 * @param {string} destination - Đường dẫn đích trên Firebase Storage
 * @param {string} mimetype - Loại MIME của file
 * @returns {Promise<string>} - Trả về URL của file trên Firebase
 */
const uploadFileToFirebase = async (tempFilePath, destination, mimetype) => {
    try {
        // Upload file lên Firebase Storage
        await bucket.upload(tempFilePath, {
            destination,
            metadata: {
                contentType: mimetype,
            },
        });

        // Xóa file tạm sau khi upload
        fs.unlinkSync(tempFilePath);

        // Trả về URL công khai của file
        return `${destination}`;
    } catch (error) {
        console.error('Error uploading file to Firebase:', error);
        throw new Error('Failed to upload file to Firebase');
    }
};

module.exports = {
    uploadFileToFirebase,
};
