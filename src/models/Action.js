const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');
const Task = require('./task');

const Action = sequelize.define('Action', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    id_user_action: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    id_user_receiver: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
},
{
    tableName: 'action',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
})

Action.belongsTo(User, { foreignKey: 'id_user_action', as: 'userAction' });
Action.belongsTo(User, { foreignKey: 'id_user_receiver', as: 'userReceiver' });
Action.belongsTo(Task, { foreignKey: 'id_task', as: 'task' });

module.exports = Action;
