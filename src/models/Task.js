const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Đường dẫn tới config database
const Sprint = require('./Sprint');

const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    id_status: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'status', // Tên bảng status
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    id_assignee: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'user', // Tên bảng user
            key: 'id',
        },
    },
    id_reporter: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'user', // Tên bảng user
            key: 'id',
        },
    },
    id_sprint: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'sprint', // Tên bảng sprint
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    no_task: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    priority: {
        type: DataTypes.STRING,
        defaultValue: 'medium',
    },
    index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    expired_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
    tableName: 'task',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

Task.belongsTo(Sprint, { foreignKey: 'id_sprint', as: 'sprint' });

module.exports = Task;
