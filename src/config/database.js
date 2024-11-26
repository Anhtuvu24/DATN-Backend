const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        port: process.env.DB_PORT,
        logging: false,
        dialectOptions: {
            useUTC: false, // Để đồng bộ hóa thời gian
            timezone: 'Asia/Ho_Chi_Minh' // Đặt múi giờ nếu cần
        },
        define: {
            // Đảm bảo rằng bảng sử dụng InnoDB và hỗ trợ khóa ngoại
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
            freezeTableName: true, // Đảm bảo tên bảng không bị thay đổi
        }
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to MySQL successfully!');
    } catch (error) {
        console.error('Unable to connect to MySQL:', error);
    }
};

module.exports = { sequelize, connectDB };
