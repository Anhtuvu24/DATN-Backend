const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Kết nối database
const User = require('./User');
const Task = require('./Task');

const Comment = sequelize.define('Comment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    id_user: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'SET NULL', // Khi xóa User, id_user sẽ được đặt NULL
        onUpdate: 'CASCADE',
    },
    id_task: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Task,
            key: 'id',
        },
        onDelete: 'CASCADE', // Khi xóa Task, Comment cũng sẽ bị xóa
        onUpdate: 'CASCADE',
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'comment',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

// Thiết lập quan hệ với User
Comment.belongsTo(User, {
    foreignKey: 'id_user',
    as: 'user',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});

// Thiết lập quan hệ với Task
Comment.belongsTo(Task, {
    foreignKey: 'id_task',
    as: 'task',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

module.exports = Comment;
