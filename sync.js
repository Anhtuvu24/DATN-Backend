const { sequelize } = require('./src/config/database'); // Đảm bảo đường dẫn chính xác
sequelize.sync({ force: false })  // 'force: false' sẽ không xóa bảng cũ, nếu bảng đã tồn tại
    .then(() => {
        console.log('Database & tables created!');
    })
    .catch((error) => {
        console.error('Unable to create table:', error);
    });
