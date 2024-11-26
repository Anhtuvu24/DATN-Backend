const ProjectType = require('../models/ProjectType');
const { Op } = require('sequelize');

// Thêm project_type
exports.addProjectType = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const existingType = await ProjectType.findOne({ where: { name } });
        if (existingType) {
            return res.status(409).json({ message: 'Project type name already exists' });
        }

        const newProjectType = await ProjectType.create({ name });

        res.status(201).json({
            message: 'Project type created successfully',
            projectType: newProjectType,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};


// Sửa project_type
exports.updateProjectType = async (req, res) => {
    try {
        const { id, name } = req.body;

        if (!id || !name) {
            return res.status(400).json({ message: 'ID and Name are required' });
        }

        const projectType = await ProjectType.findByPk(id);
        if (!projectType) {
            return res.status(404).json({ message: 'Project type not found' });
        }

        const existingType = await ProjectType.findOne({ where: { name, id: { [Op.ne]: id } } });
        if (existingType) {
            return res.status(409).json({ message: 'Project type name already exists' });
        }

        await projectType.update({ name });

        res.status(200).json({
            message: 'Project type updated successfully',
            projectType,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};


// Xóa 1 hoặc nhiều project_type
exports.deleteProjectTypes = async (req, res) => {
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

        const existingIds = await ProjectType.findAll({
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

        await ProjectType.destroy({ where: { id: ids } });

        res.status(200).json({ message: 'Project types deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};

// Lấy danh sách project_type
exports.getProjectTypes = async (req, res) => {
    try {
        const projectTypes = await ProjectType.findAll({
            attributes: ['id', 'name', 'created_at', 'updated_at'], // Chỉ lấy các cột cần thiết
            order: [['created_at', 'DESC']], // Sắp xếp giảm dần theo ngày tạo
        });

        res.status(200).json(projectTypes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};
