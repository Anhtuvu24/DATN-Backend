const admin = require('firebase-admin');
const serviceAccount = require('../../firebaseConfig.json'); // Đường dẫn tới file key

// Khởi tạo Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'gs://datn-1af41.firebasestorage.app'  // Thay bằng bucket của bạn
});

const bucket = admin.storage().bucket(); // Tạo một bucket để sử dụng chung

module.exports = { admin, bucket };
