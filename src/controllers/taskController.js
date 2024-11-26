const Task = require('../models/Task')
const Sprint = require('../models/Sprint')
const Project = require('../models/Project')

// Tạo task
exports.addTask = async (req, res) => {
    try {
        const { id_status, id_assignee, id_reporter, id_sprint, name, description } = req.body;

        if (!id_sprint) {
            return res.status(400).json({ success: false, message: 'id_sprint is required' });
        }

        // Lấy thông tin sprint và project
        const sprint = await Sprint.findOne({
            where: { id: id_sprint },
            include: [
                {
                    model: Project,
                    as: 'project', // Alias đặt trong quan hệ giữa Sprint và Project
                },
            ],
        });

        if (!sprint) {
            return res.status(404).json({ success: false, message: 'Sprint not found' });
        }

        const projectKey = sprint.project.key; // Lấy `key` của project

        // Đếm số lượng task hiện có trong sprint
        const taskCount = await Task.count({
            where: { id_sprint },
        });

        // Sinh no_task
        const no_task = `${projectKey}-${taskCount + 1}`;

        // Tạo task mới
        const task = await Task.create({
            id_status,
            id_assignee,
            id_reporter,
            id_sprint,
            no_task,
            name,
            description,
        });

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create task' });
    }
};

// Cập nhật task
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (updateData.no_task !== undefined) {
            return res.status(400).json({
                success: false,
                message: 'Field "no_task" is not editable.',
            });
        }

        const task = await Task.findByPk(id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        await task.update(updateData);

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to update task' });
    }
};

// Xóa task
exports.deleteTasks = async (req, res) => {
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
            return res.status(400).json({ success: false, message: 'Invalid input, expected an array of ids' });
        }

        const existingIds = await Task.findAll({
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

        const result = await Task.destroy({
            where: {
                id: ids,
            },
        });

        if (result === 0) {
            return res.status(404).json({ success: false, message: 'No tasks found to delete' });
        }

        res.status(200).json({
            success: true,
            message: `${result} task(s) deleted successfully`,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete task(s)' });
    }
};

// Lấy danh sách task
exports.getTasks = async (req, res) => {
    try {
        const { id_sprint } = req.params;

        if (!id_sprint) {
            return res.status(400).json({ success: false, message: 'id_sprint is required' });
        }

        const tasks = await Task.findAll({
            where: {
                id_sprint,
            },
        });

        res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
    }
}

// Lấy chi tiết task
exports.getTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findByPk(id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch task' });
    }
}