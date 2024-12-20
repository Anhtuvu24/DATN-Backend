const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');
const Task = require('./task');

const Action = sequelize.define('Action', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    id_agent: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    type_agent: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    id_user_action: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'SET NULL', // Xóa User thực hiện, giữ giá trị NULL
        onUpdate: 'CASCADE',
    },
    id_user_receiver: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'SET NULL', // Xóa User nhận, giữ giá trị NULL
        onUpdate: 'CASCADE',
    },
    id_task: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Task,
            key: 'id',
        },
        onDelete: 'CASCADE', // Xóa Task thì xóa luôn Action liên quan
        onUpdate: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Thường khi tạo mới, `is_read` nên là `false`
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
    tableName: 'action',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

// Quan hệ với User - người thực hiện hành động
Action.belongsTo(User, {
    foreignKey: 'id_user_action',
    as: 'userAction',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});

// Quan hệ với User - người nhận hành động
Action.belongsTo(User, {
    foreignKey: 'id_user_receiver',
    as: 'userReceiver',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});

// Quan hệ với Task
Action.belongsTo(Task, {
    foreignKey: 'id_task',
    as: 'task',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

module.exports = Action;