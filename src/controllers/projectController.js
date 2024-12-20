const Project = require('../models/project');
const ProjectType = require('../models/ProjectType');
const User = require('../models/User');
const Sprint = require('../models/Sprint');
const path = require('path');
const _ = require('lodash');
const { Op, Sequelize } = require("sequelize");

const { uploadFileToFirebase } = require('../services/firebaseUploader');

// Thêm project
exports.createProject = async (req, res) => {
    try {
        const { id_type, id_lead, name, key, is_favorite } = req.body;
        const file = req.file; // Lấy file từ form-data
        // Kiểm tra xem project với key đã tồn tại chưa
        const existingProject = await Project.findOne({ where: { key } });
        if (existingProject) {
            return res.status(400).json({
                message: `Project with key "${key}" already exists`,
            });
        }

        // Kiểm tra id_type có tồn tại trong bảng project_type không
        const projectType = id_type ? await ProjectType.findByPk(id_type, {
            attributes: ['id', 'name'], // Chỉ lấy trường name cần thiết
        }) : null;
        if (id_type && !projectType) {
            return res.status(400).json({ message: 'Invalid id_type, not found in project_type table' });
        }

        // Kiểm tra id_lead có tồn tại trong bảng user không
        const leadUser = id_lead ? await User.findByPk(id_lead, {
            attributes: ['id', 'user_name', 'avatar'], // Chỉ lấy trường user_name cần thiết
        }) : null;
        if (id_lead && !leadUser) {
            return res.status(400).json({ message: 'Invalid id_lead, not found in user table' });
        }

        // Đường dẫn icon mặc định
        let projectIcon = null;

        if (file) {
            // Tải file lên Firebase Storage nếu có file
            const destination = `projects/icons/${Date.now()}-${file.originalname}`;
            projectIcon = await uploadFileToFirebase(file.path, destination, file.mimetype);
        }

        // Tạo project mới
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
            project: {
                id: newProject.id,
                name: newProject.name,
                key: newProject.key,
                icon: newProject.icon,
                is_favorite: newProject.is_favorite,
                user_name: id_lead ? leadUser.user_name : null, // Trả về user_name của lead
                user_avatar: id_lead ? leadUser.avatar : null, // Trả về user_name của lead
                project_type_name: id_type ? projectType.name : null, // Trả về name của projectType
            },
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
        const { id_type, id_lead, name, key, is_favorite } = req.body;
        const file = req.file;

        // Tìm project theo ID
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Kiểm tra id_type
        let projectType = null;
        if (id_type) {
            projectType = await ProjectType.findByPk(id_type, { attributes: ['id', 'name'] });
            if (!projectType) {
                return res.status(400).json({ message: 'Invalid id_type, not found in project_type table' });
            }
        } else if (project.id_type) {
            projectType = await ProjectType.findByPk(project.id_type, { attributes: ['id', 'name'] });
        }

        // Kiểm tra id_lead
        let leadUser = null;
        if (id_lead) {
            leadUser = await User.findByPk(id_lead, { attributes: ['id', 'user_name'] });
            if (!leadUser) {
                return res.status(400).json({ message: 'Invalid id_lead, not found in user table' });
            }
        } else if (project.id_lead) {
            leadUser = await User.findByPk(project.id_lead, { attributes: ['id', 'user_name'] });
        }

        // Cập nhật icon nếu có file mới
        let updatedIcon = project.icon;
        if (file) {
            const destination = `projects/icons/${Date.now()}-${file.originalname}`;
            updatedIcon = await uploadFileToFirebase(file.path, destination, file.mimetype);
        }

        // Cập nhật thông tin project
        await project.update({
            id_type: id_type || project.id_type,
            id_lead: id_lead || project.id_lead,
            name: name || project.name,
            key: key || project.key,
            icon: updatedIcon,
            is_favorite: is_favorite !== undefined ? is_favorite : project.is_favorite,
        });

        // Trả về project với cấu trúc yêu cầu
        res.status(200).json({
            message: 'Project updated successfully',
            project: {
                id: project.id,
                name: project.name,
                key: project.key,
                icon: project.icon,
                is_favorite: project.is_favorite,
                user_name: leadUser ? leadUser.user_name : null,
                project_type_name: projectType ? projectType.name : null,
            },
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        const searchCondition = search
            ? {
                [Op.or]: [
                    Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Project.name')), {
                        [Op.like]: `%${search.toLowerCase()}%`,
                    }),
                    Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Project.key')), {
                        [Op.like]: `%${search.toLowerCase()}%`,
                    }),
                    Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('type.name')), {
                        [Op.like]: `%${search.toLowerCase()}%`,
                    }),
                    Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('lead.user_name')), {
                        [Op.like]: `%${search.toLowerCase()}%`,
                    }),
                ],
            }
            : {};

        const { rows: projects, count: totalProjects } = await Project.findAndCountAll({
            where: searchCondition,
            include: [
                { model: ProjectType, as: 'type', attributes: ['name'] },
                { model: User, as: 'lead', attributes: ['user_name', 'avatar'] },
            ],
            limit,
            offset,
        });

        const totalPages = Math.ceil(totalProjects / limit);

        const formattedProjects = projects.map((project) => {
            const projectData = project.toJSON();
            return {
                id: projectData.id,
                name: projectData.name,
                key: projectData.key,
                icon: projectData.icon,
                is_favorite: projectData.is_favorite,
                id_lead: projectData.id_lead,
                user_name: projectData.lead?.user_name || null, // Lấy user_name của lead
                user_avatar: projectData.lead?.avatar,
                project_type_name: projectData.type?.name || null, // Lấy name của project type
            };
        });

        res.status(200).json({
            data: formattedProjects,
            pagination: {
                total: totalProjects,
                page,
                limit,
                totalPages,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
    }
};

// Lấy project theo id
exports.getProjectById = async (req, res) => {
    try {
        const projectId = req.params.id;

        // Lấy thông tin project
        const project = await Project.findByPk(projectId, {
            include: [
                { model: ProjectType, as: 'type', attributes: ['name'] },
                { model: User, as: 'lead', attributes: ['user_name'] },
            ],
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Lấy các sprint đang active của project
        const activeSprints = await Sprint.findAll({
            where: { id_project: projectId, is_close: false },
        });

        res.status(200).json({
            data: {
                id: project.id,
                name: project.name,
                key: project.key,
                icon: project.icon,
                is_favorite: project.is_favorite,
                user_name: project.lead?.user_name || null,
                project_type_name: project.type?.name || null,
                active_sprints: activeSprints,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch project', error: error.message });
    }
};
