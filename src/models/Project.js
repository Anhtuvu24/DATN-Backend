const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require("./User");
const ProjectType = require("./ProjectType");

const Project = sequelize.define('Project', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    id_type: {
        type: DataTypes.UUID,
        allowNull: true, // Cho phép NULL vì onDelete: 'SET NULL'
        references: {
            model: ProjectType,
            key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    },
    id_lead: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'SET NULL', // Xóa User thì cột id_lead sẽ được NULL
        onUpdate: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    key: {
        type: DataTypes.STRING,
        unique: true
    },
    description: {
        type: DataTypes.STRING,
    },
    icon: {
        type: DataTypes.STRING
    },
    is_favorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
}, {
    tableName: 'project',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

// Thiết lập quan hệ
Project.belongsTo(User, {
    foreignKey: 'id_lead',
    as: 'lead',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});

Project.belongsTo(ProjectType, {
    foreignKey: 'id_type',
    as: 'type',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});

module.exports = Project;
