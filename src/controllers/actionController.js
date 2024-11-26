const Action = require('../models/Action')
const User = require('../models/User')
const Task = require('../models/Task')

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

    try {
        const actions = await Action.findAll({
            where: { id_user_receiver },
            include: [
                {
                    model: User,
                    as: 'userAction',
                    attributes: ['id', 'user_name', 'gmail', 'avatar'],
                },
                {
                    model: Task,
                    as: 'task',
                    attributes: ['id', 'name', 'no_task'],
                },
            ],
            order: [['created_at', 'DESC']],
        });

        return res.status(200).json({ success: true, data: actions });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to get list action' });
    }
};



