const { Op } = require('sequelize');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const Status = require('../models/Status'); // Import model Status

exports.addSprint = async (req, res) => {
    try {
        const { id_project, is_close, start_date, end_date } = req.body;

        // Lấy danh sách các Sprint của project và tìm số thứ tự lớn nhất
        const existingSprints = await Sprint.findAll({
            where: { id_project },
            order: [['name', 'DESC']], // Sắp xếp giảm dần theo tên
        });

        // Tự động sinh tên dựa trên số lớn nhất trong tên sprint
        let nextSprintNumber = 1; // Mặc định là 1 nếu chưa có Sprint
        let lastSprint = null; // Sprint gần nhất (nếu tồn tại)
        if (existingSprints.length > 0) {
            lastSprint = existingSprints[0];
            const match = lastSprint.name.match(/sprint (\d+)/i); // Tìm số cuối cùng trong tên
            if (match) {
                nextSprintNumber = parseInt(match[1], 10) + 1; // Tăng số lên 1
            }
        }

        const newSprintName = `sprint ${nextSprintNumber}`;

        // Tạo Sprint mới
        const sprint = await Sprint.create({
            id_project,
            name: newSprintName,
            is_close,
            start_date,
            end_date,
        });

        let movedTasksCount = 0; // Đếm số lượng task được chuyển

        // Nếu có Sprint trước đó, kiểm tra các task chưa hoàn thành
        if (lastSprint) {
            // Lấy `id` của status có `name` là 'none'
            const doneStatus = await Status.findOne({ where: { name: 'DONE' } });
            if (!doneStatus) {
                return res.status(400).json({ success: false, message: "Status 'DONE' not exist." });
            }

            // Tìm các task chưa hoàn thành (trạng thái không phải 'none')
            const tasksInLastSprint = await Task.findAll({
                where: {
                    id_sprint: lastSprint.id,
                    id_status: { [Op.ne]: doneStatus.id },
                },
            });

            // Chuyển các task chưa hoàn thành vào Sprint mới
            for (const task of tasksInLastSprint) {
                await task.update({ id_sprint: sprint.id });
            }

            movedTasksCount = tasksInLastSprint.length;
        }

        res.status(201).json({
            success: true,
            data: sprint,
            message: lastSprint
                ? `Sprint ${newSprintName} created. ${movedTasksCount} tasks moved from Sprint ${lastSprint.name}.`
                : `Sprint ${newSprintName} created.`,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create sprint' });
    }
};

// Sửa sprint
// router.put('/sprints/:id', );
exports.updateSprint = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const sprint = await Sprint.findByPk(id);
        if (!sprint) {
            return res.status(404).json({ success: false, message: 'Sprint not found' });
        }

        await sprint.update(updateData);

        res.status(200).json({ success: true, data: sprint });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to update sprint' });
    }
}

// Xóa sprint
// router.delete('/sprints/:id', );
exports.deleteSprint = async (req, res) => {
    try {
        let { ids } = req.body; // Danh sách các ID Sprint cần xóa

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

        const existingIds = await Sprint.findAll({
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

        // Xóa các Sprint với id được truyền vào
        const result = await Sprint.destroy({
            where: {
                id: ids,
            },
        });

        if (result === 0) {
            return res.status(404).json({ success: false, message: 'No sprints found to delete' });
        }

        res.status(200).json({
            success: true,
            message: `${result} sprint(s) deleted successfully`,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete sprint(s)' });
    }
}

// Lấy danh sách srpint
// router.get('/sprints', );
exports.getSprints = async (req, res) => {
    try {
        const sprints = await Sprint.findAll();

        res.status(200).json({ success: true, data: sprints });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch sprints' });
    }
}

// Chi tiết sprint
// router.get('/sprints/:id', );
exports.getSprint = async (req, res) => {
    try {
        const { id } = req.params;

        const sprint = await Sprint.findByPk(id);
        if (!sprint) {
            return res.status(404).json({ success: false, message: 'Sprint not found' });
        }

        res.status(200).json({ success: true, data: sprint });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch sprint' });
    }
}
