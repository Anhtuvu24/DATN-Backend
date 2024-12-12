const StatusType = require('../models/Status');
const { Op } = require('sequelize');

// Thêm status
exports.addStatus = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const existingStatus = await StatusType.findOne({ where: { name } });
        if (existingStatus) {
            return res.status(409).json({ message: 'Status name already exists' });
        }

        const newStatus = await StatusType.create({ name });

        res.status(201).json({
            message: 'Status created successfully',
            status: newStatus,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};


// Sửa status
exports.updateStatus = async (req, res) => {
    try {
        const { id, name, is_active } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'ID and Name are required' });
        }

        const status = await StatusType.findByPk(id);
        if (!status) {
            return res.status(404).json({ message: 'Status type not found' });
        }
        if (name) {
            const existingType = await StatusType.findOne({ where: { name, id: { [Op.ne]: id } } });
            if (existingType) {
                return res.status(409).json({ message: 'Status name already exists' });
            }
        }
        const updatedData = {};
        if (name) updatedData.name = name;
        if (is_active !== undefined) updatedData.is_active = is_active;

        await status.update(updatedData);

        res.status(200).json({
            message: 'Status updated successfully',
            status: await StatusType.findByPk(id),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};


// Xóa 1 hoặc nhiều project_type
exports.deleteStatuses = async (req, res) => {
    try {
        let { ids } = req.body;

        if (typeof ids === 'string') {
            try {
                ids = JSON.parse(ids);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid JSON format for ids' });
            }
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Invalid or missing ids' });
        }

        const existingIds = await StatusType.findAll({
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

        await StatusType.destroy({ where: { id: ids } });

        res.status(200).json({ message: 'Project types deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};

// Lấy danh sách project_type
exports.getStatuses = async (req, res) => {
    try {
        const statuses = await StatusType.findAll({
            attributes: ['id', 'name', 'is_active', 'created_at', 'updated_at'],
            order: [['created_at', 'ASC']],
        });

        res.status(200).json({
            data: statuses
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};
