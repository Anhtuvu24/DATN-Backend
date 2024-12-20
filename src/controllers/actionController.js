const Action = require('../models/Action')
const User = require('../models/User')
const Task = require('../models/Task')
const Comment = require('../models/Comment')
const { Op } = require('sequelize');
const Project = require("../models/Project");
const Sprint = require("../models/Sprint");

exports.createAction = async (req, res) => {
    const { id_user_action, id_user_receiver, id_task, name } = req.body;

    try {
        const action = await Action.create({
            id_user_action,
            id_user_receiver,
            id_task,
            name,
        });

        return res.status(201).json({ success: true, data: action });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to create action' });
    }
};

exports.updateAction = async (req, res) => {
    const { id } = req.params;
    const { is_read } = req.body;

    try {
        const action = await Action.findByPk(id);

        if (!action) {
            return res.status(404).json({ success: false, message: 'Action not found' });
        }

        action.is_read = is_read;

        await action.save();

        return res.status(200).json({ success: true, data: action });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to update action' });
    }
};

exports.deleteAction = async (req, res) => {
    try {
        let { ids } = req.body;

        if (typeof ids === 'string') {
            try {
                ids = JSON.parse(ids);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid JSON format for ids' });
            }
        }

        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({
                success: false,
                message: 'Field "ids" must be an array of comment IDs.',
            });
        }

        const existingIds = await Action.findAll({
            where: { id: ids },
            attributes: ['id'],
        });

        const foundIds = existingIds.map((item) => item.id);
        const missingIds = ids.filter((id) => !foundIds.includes(id));

        if (missingIds.length > 0) {
            return res.status(404).json({
                message: 'Some IDs do not exist in the database',
                missingIds,
            });
        }

        const deletedCount = await Action.destroy({
            where: { id: ids },
        });

        return res.status(200).json({
            success: true,
            message: `Delete ${deletedCount} action success.`,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to delete action' });
    }
};

exports.getActionsByReceiver = async (req, res) => {
    const { id_user_receiver } = req.params;
    const { page = 1, limit = 10 } = req.query; // Mặc định page = 1 và limit = 10

    try {
        // Phân trang
        const offset = (page - 1) * limit;

        // Lấy các actions với phân trang
        const { rows: actions, count: totalActions } = await Action.findAndCountAll({
            where: { id_user_receiver, id_user_action: { [Op.ne]: id_user_receiver }, },
            include: [
                {
                    model: User,
                    as: 'userAction',
                    attributes: ['id', 'user_name', 'gmail', 'avatar'],
                },
                {
                    model: Task,
                    as: 'task',
                    include: [
                        {
                            model: Sprint,
                            as: 'sprint',
                            attributes: ['id', 'name'],
                            include: [
                                {
                                    model: Project,
                                    as: 'project',
                                    attributes: ['id', 'name'],
                                },
                            ],
                        },
                    ]
                },
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit, 10),
            offset,
        });

        // Lấy số lượng actions có is_read = false
        const unreadCount = await Action.count({
            where: {
                id_user_receiver,
                id_user_action: { [Op.ne]: id_user_receiver },
                is_read: false
            },
        });

        // Gắn thêm thông tin comment nếu type_agent là comment
        const actionsWithDetails = await Promise.all(
            actions.map(async (action) => {
                if (action.type_agent === 'comment' && action.id_agent) {
                    const comment = await Comment.findByPk(action.id_agent, {
                        attributes: ['id', 'text', 'id_user', 'created_at'],
                    });
                    return { ...action.toJSON(), comment };
                }
                return action.toJSON();
            })
        );

        // Trả về kết quả
        return res.status(200).json({
            success: true,
            data: actionsWithDetails,
            pagination: {
                currentPage: parseInt(page, 10),
                totalPages: Math.ceil(totalActions / limit),
                totalActions,
                unreadCount,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to get list action' });
    }
};

exports.getActionsByTask = async (req, res) => {
    const { id_task } = req.params;
    const { page = 1, limit = 10 } = req.query; // Mặc định page = 1 và limit = 10

    try {
        // Phân trang
        const offset = (page - 1) * limit;

        // Lấy các actions với phân trang
        const { rows: actions, count: totalActions } = await Action.findAndCountAll({
            where: { id_task },
            include: [
                {
                    model: User,
                    as: 'userAction',
                    attributes: ['id', 'user_name', 'gmail', 'avatar'],
                },
                {
                    model: User,
                    as: 'userReceiver',
                    attributes: ['id', 'user_name', 'gmail', 'avatar'],
                },
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit, 10),
            offset,
        });

        // Gắn thêm thông tin comment nếu type_agent là comment
        const actionsWithDetails = await Promise.all(
            actions.map(async (action) => {
                if (action.type_agent === 'comment' && action.id_agent) {
                    const comment = await Comment.findByPk(action.id_agent, {
                        attributes: ['id', 'text', 'id_user', 'created_at'],
                    });
                    return { ...action.toJSON(), comment };
                }
                return action.toJSON();
            })
        );

        // Trả về kết quả
        return res.status(200).json({
            success: true,
            data: actionsWithDetails,
            pagination: {
                currentPage: parseInt(page, 10),
                totalPages: Math.ceil(totalActions / limit),
                totalActions,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to get list action' });
    }
};



