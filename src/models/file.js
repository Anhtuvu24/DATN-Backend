const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Task = require('./Task');

const File = sequelize.define(
    'File',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        url: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        id_task: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: Task,
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        size: {
            type: DataTypes.INTEGER, // Lưu kích thước file (bytes)
            allowNull: true,
        },
        mimetype: {
            type: DataTypes.STRING, // Lưu định dạng MIME của file
            allowNull: true,
        },
    },
    {
        tableName: 'files',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

// Thiết lập quan hệ với bảng Task
File.belongsTo(Task, {
    foreignKey: 'id_task',
    as: 'task',
    onDelete: 'CASCADE',
});

module.exports = File;
