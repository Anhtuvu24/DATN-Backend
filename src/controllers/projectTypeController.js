const ProjectType = require('../models/ProjectType');
const Project = require('../models/Project');
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

        await Project.update(
            { id_type: null },
            { where: { id_type: ids } }
        );

        await ProjectType.destroy({ where: { id: ids } });

        res.status(200).json({ message: 'Project types deleted successfully and related projects updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};

exports.deleteProjectType = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'ID is required' });
        }

        const projectType = await ProjectType.findByPk(id);

        if (!projectType) {
            return res.status(404).json({ message: 'Project type not found' });
        }

        await Project.update(
            { id_type: null },
            { where: { id_type: id } }
        );

        await projectType.destroy();

        res.status(200).json({ message: 'Project type deleted successfully and related projects updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};

// Lấy danh sách project_type
exports.getProjectTypes = async (req, res) => {
    try {
        // Lấy page và limit từ query params, giá trị mặc định nếu không cung cấp
        const page = parseInt(req.query.page, 10) || 1; // Trang hiện tại (mặc định là 1)
        const limit = parseInt(req.query.limit, 10) || 10; // Số bản ghi mỗi trang (mặc định là 10)

        if (page < 1 || limit < 1) {
            return res.status(400).json({ message: 'Page and limit must be positive integers' });
        }

        // Tính toán offset
        const offset = (page - 1) * limit;

        // Lấy dữ liệu với phân trang
        const { rows: projectTypes, count: totalItems } = await ProjectType.findAndCountAll({
            attributes: ['id', 'name', 'created_at', 'updated_at'], // Chỉ lấy các cột cần thiết
            order: [['created_at', 'DESC']], // Sắp xếp giảm dần theo ngày tạo
            limit,
            offset,
        });

        // Tính tổng số trang
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
            },
            data: projectTypes,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};
