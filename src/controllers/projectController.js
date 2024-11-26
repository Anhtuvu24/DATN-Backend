const Project = require('../models/project');
const ProjectType = require('../models/ProjectType');
const User = require('../models/User');
const path = require('path');

// Thêm project
exports.createProject = async (req, res) => {
    try {
        const { id_type, id_lead, name, key, is_favorite } = req.body;

        const existingProject = await Project.findOne({ where: { key } });
        if (existingProject) {
            return res.status(400).json({
                message: `Project with key "${key}" already exists`,
            });
        }

        const projectTypeExists = await ProjectType.findByPk(id_type);
        if (!projectTypeExists) {
            return res.status(400).json({ message: 'Invalid id_type, not found in project_type table' });
        }

        const userExists = await User.findByPk(id_lead);
        if (!userExists) {
            return res.status(400).json({ message: 'Invalid id_lead, not found in user table' });
        }

        const defaultIcon = path.join(__dirname, '../assets/images/project_icon_df');
        const iconPath = req.file ? `/uploads/${req.file.filename}` : null;
        const projectIcon = iconPath || defaultIcon;

        const newProject = await Project.create({
            id_type,
            id_lead,
            name,
            key,
            icon: projectIcon,
            is_favorite: is_favorite || false,
        });

        res.status(201).json({
            message: 'Project created successfully',
            project: newProject,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create project', error: error.message });
    }
};

// Sửa project
exports.updateProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { id_type, id_lead, name, key, icon, is_favorite } = req.body;

        // Tìm project theo ID
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Kiểm tra id_type có tồn tại (nếu được cung cấp)
        if (id_type) {
            const projectTypeExists = await ProjectType.findByPk(id_type);
            if (!projectTypeExists) {
                return res.status(400).json({ message: 'Invalid id_type, not found in project_type table' });
            }
        }

        // Kiểm tra id_lead có tồn tại (nếu được cung cấp)
        if (id_lead) {
            const userExists = await User.findByPk(id_lead);
            if (!userExists) {
                return res.status(400).json({ message: 'Invalid id_lead, not found in user table' });
            }
        }

        const iconPath = req.file ? `/uploads/${req.file.filename}` : null;
        // Cập nhật project
        await project.update({
            id_type: id_type || project.id_type,
            id_lead: id_lead || project.id_lead,
            name: name || project.name,
            key: key || project.key,
            icon: iconPath || project.icon,
            is_favorite: is_favorite !== undefined ? is_favorite : project.is_favorite,
        });

        res.status(200).json({
            message: 'Project updated successfully',
            project,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update project', error: error.message });
    }
};

// Xóa project
exports.deleteProject = async (req, res) => {
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

        const existingIds = await Project.findAll({
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

        // Xóa các project
        await Project.destroy({ where: { id: ids } });

        res.status(200).json({ message: 'Projects deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete projects', error: error.message });
    }
};

// Lấy danh sách
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.findAll({
            include: [
                { model: ProjectType, as: 'type', attributes: ['id', 'name'] },
                { model: User, as: 'lead', attributes: ['id', 'user_name', 'gmail'] },
            ],
        });

        res.status(200).json({ data: projects });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
    }
};

// Lấy project theo id
exports.getProjectById = async (req, res) => {
    try {
        const projectId = req.params.id;

        // Tìm project theo ID
        const project = await Project.findByPk(projectId, {
            include: [
                { model: ProjectType, as: 'type', attributes: ['id', 'name'] },
                { model: User, as: 'lead', attributes: ['id', 'user_name', 'gmail'] },
            ],
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(200).json({ project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch project', error: error.message });
    }
};
