const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuthenToken = sequelize.define('AuthenToken', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    refresh_token: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    timestamps: true,
    tableName: 'authen_token',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = AuthenToken;
