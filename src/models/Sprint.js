const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Đảm bảo rằng bạn đã cấu hình kết nối Sequelize
const Project = require('./Project'); // Import model Project

const Sprint = sequelize.define(
    'Sprint',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        id_project: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        is_close: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
        tableName: 'sprint',
        timestamps: true, // Tự động thêm `created_at` và `updated_at`
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

// Thiết lập quan hệ với Project
Sprint.belongsTo(Project, {
    foreignKey: 'id_project',
    as: 'project',
    onDelete: 'CASCADE', // Xóa project thì xóa sprint liên quan
});

module.exports = Sprint;
