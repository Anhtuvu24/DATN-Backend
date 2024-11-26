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
        allowNull: false,
    },
    id_lead: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    key: { type: DataTypes.STRING, unique: true },
    icon: { type: DataTypes.STRING },
    is_favorite: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
    tableName: 'project',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

Project.belongsTo(User, { foreignKey: 'id_lead', as: 'lead', constraints: true, onDelete: 'cascade' });
Project.belongsTo(ProjectType, { foreignKey: 'id_type', as: 'type', constraints: true, onDelete: 'cascade' });

module.exports = Project;
