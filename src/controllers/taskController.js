const Task = require('../models/Task')
const Sprint = require('../models/Sprint')
const Project = require('../models/Project')
const Status = require('../models/Status')
const File = require('../models/file')
const User = require('../models/User')
const Comment = require('../models/Comment')
const Action = require('../models/Action')
const { uploadFileToFirebase } = require('../services/firebaseUploader');
const { sequelize } = require('../config/database');
const {Op} = require("sequelize");
const jwt = require('jsonwebtoken');

// Tạo task
exports.addTask = async (req, res) => {
    try {
        const { id_status, id_assignee, id_reporter, id_sprint, name, priority, description, expired_at } = req.body;

        if (!id_sprint) {
            return res.status(400).json({ success: false, message: 'id_sprint is required' });
        }

        // Lấy thông tin sprint và project
        const sprint = await Sprint.findOne({
            where: { id: id_sprint },
            include: [
                {
                    model: Project,
                    as: 'project',
                },
            ],
        });

        if (!sprint) {
            return res.status(404).json({ success: false, message: 'Sprint not found' });
        }

        const projectKey = sprint.project.key;
        const id_project = sprint.project.id;

        // Lấy tất cả các sprint thuộc cùng một project
        const sprints = await Sprint.findAll({
            where: { id_project },
            attributes: ['id'],
        });

        const sprintIds = sprints.map(s => s.id);

        // Lấy ID của status có name là 'TO DO'
        const status = await Status.findOne({
            where: { id: id_status },
        });

        if (!status) {
            return res.status(404).json({ success: false, message: 'Default status TO DO not found' });
        }

        // Tìm no_task lớn nhất hiện tại trong sprint
        const maxTask = await Task.findOne({
            where: { id_sprint: sprintIds },
            attributes: ['no_task'],
            order: [[sequelize.fn('LENGTH', sequelize.col('no_task')), 'DESC'], ['no_task', 'DESC']],
        });

        let nextTaskNumber = 1; // Mặc định số thứ tự là 1
        if (maxTask && maxTask.no_task) {
            const noTaskParts = maxTask.no_task.split('-');
            const taskNumber = noTaskParts.length > 1 ? parseInt(noTaskParts.pop(), 10) : NaN;
            if (!isNaN(taskNumber)) {
                nextTaskNumber = taskNumber + 1;
            }
        }

        const no_task = `${projectKey}-${nextTaskNumber}`;

        const maxTaskIndex = await Task.max('index', {
            where: {
                id_status,
                id_sprint,
            },
        });

        const newIndex = maxTaskIndex !== null ? maxTaskIndex + 1 : 0;

        // Tạo task mới
        const task = await Task.create({
            id_status,
            id_assignee: id_assignee || null,
            id_reporter,
            id_sprint,
            no_task,
            name,
            priority,
            expired_at,
            description,
            index: newIndex,
        });

        console.log(id_assignee)
        // Tạo Action liên quan đến Task vừa tạo
        if (id_reporter && id_assignee) {
            const reporter = await User.findByPk(id_reporter, { attributes: ['user_name'] });
            const actionName = `${reporter.user_name} assigned task ${no_task} to you`;

            await Action.create({
                id_user_action: id_reporter,
                id_user_receiver: id_assignee,
                id_task: task.id,
                name: actionName,
                id_agent: task.id,
                type_agent: 'task'
            });
        }

        // Xử lý file upload
        const files = req.files;
        const uploadedFiles = [];

        if (files && files.length > 0) {
            for (const file of files) {
                const tempFilePath = file.path;
                const destination = `files/${task.id}/${file.filename}`;
                const mimetype = file.mimetype;

                // Upload file lên Firebase
                const fileUrl = await uploadFileToFirebase(tempFilePath, destination, mimetype);

                // Lưu thông tin file vào database
                const newFile = await File.create({
                    url: fileUrl,
                    name: file.originalname,
                    id_task: task.id,
                    size: file.size,
                    mimetype,
                });

                uploadedFiles.push(newFile);
            }
        }

        res.status(201).json({
            success: true,
            data: {
                task,
                files: uploadedFiles,
            },
        });
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

        // Lấy thông tin người thao tác từ token
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findByPk(verified.id, {
            attributes: ['id', 'user_name', 'gmail', 'gender', 'avatar', 'role', 'is_active'],
        });
        const id_user_action = currentUser.id;

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

        const id_sprint = task.id_sprint;
        let actionName;

        // Kiểm tra nếu `id_status` thay đổi
        if (updateData.id_status && updateData.id_status !== task.id_status) {
            const oldStatus = await Status.findByPk(task.id_status, { attributes: ['name'] });
            const newStatus = await Status.findByPk(updateData.id_status, { attributes: ['name'] });

            const newStatusTasks = await Task.findAll({
                where: { id_sprint, id_status: updateData.id_status },
                order: [['index', 'DESC']],
                limit: 1,
            });

            const maxIndex = newStatusTasks.length > 0 ? newStatusTasks[0].index : -1;
            updateData.index = maxIndex + 1;

            actionName = `${currentUser.user_name} changed task ${task.no_task} from status ${oldStatus.name} to ${newStatus.name}`;
        } else {
            actionName = `${currentUser.user_name} updated task ${task.no_task}`;
        }

        const isChangeAssignee = updateData.id_assignee !== task.id_assignee;

        if (isChangeAssignee) {
            actionName = `${currentUser.user_name} assigned task ${task.no_task} to you`
        }

        // Cập nhật task
        await task.update(updateData);

        // if (id_user_action !== task.id_reporter) {
        await Action.create({
            id_user_action,
            id_user_receiver: task.id_reporter,
            id_task: task.id,
            name: actionName,
            id_agent: task.id,
            type_agent: 'task'
        });
        // }

        // if (id_user_action !== task.id_assignee) {
        await Action.create({
            id_user_action,
            id_user_receiver: isChangeAssignee ? updateData.id_assignee : task.id_assignee,
            id_task: task.id,
            name: actionName,
            id_agent: task.id,
            type_agent: 'task'
        });
        // }

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

        // Kiểm tra và parse `ids` nếu là string
        if (typeof ids === 'string') {
            try {
                ids = JSON.parse(ids);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid JSON format for ids' });
            }
        }

        // Kiểm tra input hợp lệ
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid input, expected an array of ids' });
        }

        // Lấy thông tin các task tồn tại trong database
        const existingTasks = await Task.findAll({
            where: { id: ids },
            attributes: ['id', 'status', 'index'],
        });

        const foundIds = existingTasks.map((task) => task.id);
        const missingIds = ids.filter((id) => !foundIds.includes(id));

        // Kiểm tra nếu có ID nào không tồn tại
        if (missingIds.length > 0) {
            return res.status(404).json({
                message: 'Some IDs do not exist in the database',
                missingIds,
            });
        }

        // Lấy danh sách status cần cập nhật
        const statusesToUpdate = [...new Set(existingTasks.map((task) => task.status))];

        // Xóa task
        const result = await Task.destroy({
            where: {
                id: ids,
            },
        });

        if (result === 0) {
            return res.status(404).json({ success: false, message: 'No tasks found to delete' });
        }

        // Cập nhật lại index của các task còn lại và lấy danh sách cập nhật
        const updatedTasksByStatus = {};
        for (const status of statusesToUpdate) {
            const tasksInStatus = await Task.findAll({
                where: { status },
                order: [['index', 'ASC']],
            });

            // Cập nhật lại index cho từng task
            await Promise.all(
                tasksInStatus.map((task, index) => task.update({ index }))
            );

            // Lưu danh sách tasks đã cập nhật vào kết quả trả về
            updatedTasksByStatus[status] = tasksInStatus.map((task) => ({
                id: task.id,
                index: task.index,
                status: task.status,
            }));
        }

        res.status(200).json({
            success: true,
            message: `${result} task(s) deleted and indexes updated successfully`,
            updatedTasksByStatus, // Danh sách tasks đã cập nhật cho mỗi status
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete task(s)' });
    }
};

exports.deleteTask = async (req, res) => {
    const { id } = req.params;

    try {
        // Tìm task cần xóa
        const taskToDelete = await Task.findByPk(id);

        if (!taskToDelete) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const { id_status, id_sprint, index } = taskToDelete;

        await Action.destroy({
            where: { id_agent: id },
        });

        // Xóa task
        await taskToDelete.destroy();

        // Cập nhật lại index của các task còn lại trong cùng status và sprint
        const tasksInStatus = await Task.findAll({
            where: { id_status, id_sprint },
            order: [['index', 'ASC']],
        });

        await Promise.all(
            tasksInStatus.map((task, idx) => task.update({ index: idx }))
        );

        // Lấy danh sách các task đã được cập nhật
        const updatedTasksByStatus = {
            [id_status]: tasksInStatus.map((task) => (task)),
        };

        res.status(200).json({
            success: true,
            message: `Task with ID ${id} deleted successfully`,
            id_sprint: id_sprint,
            id_status: id_status,
            updatedTasksByStatus,
        });
    } catch (error) {
        console.error('Failed to delete task:', error);
        res.status(500).json({ success: false, message: 'Failed to delete task' });
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

        const task = await Task.findByPk(id, {
            include: [
                {
                    model: File,
                    as: 'files',
                    attributes: ['id', 'name', 'url', 'mimetype', 'created_at'],
                },
                {
                    model: Sprint,
                    as: 'sprint', // Alias cho liên kết giữa Task và Sprint
                    attributes: ['id', 'name'], // Chỉ lấy trường cần thiết từ Sprint
                    include: [
                        {
                            model: Project,
                            as: 'project', // Alias cho liên kết giữa Sprint và Project
                            attributes: ['id', 'name'], // Chỉ lấy trường cần thiết từ Project
                        },
                    ],
                },
                {
                    model: Comment,
                    as: 'comments',
                    attributes: ['id', 'text', 'created_at', 'updated_at'], // Các trường cần thiết
                    include: [
                        {
                            model: User,
                            as: 'user',
                        },

                    ],
                    order: [['created_at', 'DESC']],
                },
            ],
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        res.status(200).json({
            success: true,
            task,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch task' });
    }
};

// API Lấy danh sách Task với tìm kiếm, lọc, sắp xếp, và phân trang
exports.searchTasks = async (req, res) => {
    try {
        const {
            search = '',
            filterKey = '',
            filterValue = '',
            order = 'ASC',
            limit = 10,
            page = 1,
        } = req.query;

        const offset = (page - 1) * limit;

        // Điều kiện tìm kiếm
        const whereCondition = {
            [Op.and]: [
                search ? {
                    [Op.or]: [
                        { no_task: { [Op.like]: `%${search}%` } },
                        { name: { [Op.like]: `%${search}%` } },
                    ],
                } : {},
                filterKey && filterValue ? {
                    [filterKey]: Array.isArray(filterValue)
                        ? { [Op.in]: filterValue } // Lọc theo nhiều giá trị
                        : filterValue, // Lọc theo một giá trị
                } : {},
            ],
        };

        // Sắp xếp
        const orderCondition = filterKey ? [[filterKey, order.toUpperCase()]] : [];

        // Lấy danh sách tasks
        const { count, rows } = await Task.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
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
        });

        res.status(200).json({
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to search tasks' });
    }
};

exports.getTasksGroupedByStatus = async (req, res) => {
    try {
        const sprintId = req.params.sprintId;

        // Lấy danh sách tất cả các status
        const statuses = await Status.findAll({
            attributes: ['id', 'name'], // Lấy ID và tên của status
            order: [['created_at', 'ASC']],
        });

        // Lấy danh sách các tasks của sprint hiện tại
        const tasks = await Task.findAll({
            where: { id_sprint: sprintId },
            include: [
                {
                    model: Status,
                    as: 'status',
                    attributes: ['id', 'name'], // Lấy thông tin của status
                },
            ],
        });

        const groupedTasks = statuses.map((status) => {
            const tasksForStatus = tasks
                .filter((task) => task.id_status === status.id) // Lọc tasks có `id_status` trùng với `status.id`
                .map((task) => ({
                    id: task.id,
                    name: task.name,
                    description: task.description,
                    priority: task.priority,
                    expired_at: task.expired_at,
                    id_sprint: sprintId,
                    no_task: task.no_task,
                    id_status: status.id,
                    index: task.index,
                    id_assignee: task.id_assignee,
                    id_reporter: task.id_reporter,
                    created_at: task.created_at,
                    updated_at: task.updated_at,
                }));

            return {
                id: status.id,
                title: status.name,
                tasks: tasksForStatus, // Danh sách các tasks hoặc mảng rỗng nếu không có tasks
            };
        });

        res.status(200).json({
            sprint_id: sprintId,
            tasks_by_status: groupedTasks,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch tasks grouped by status', error: error.message });
    }
};

// Test
async function getTasksBySprint(id_sprint) {
    const tasks = await Task.findAll({
        where: { id_sprint },
        order: [['created_at', 'ASC']],
    });

    // Gom nhóm tasks theo trạng thái
    const tasksByStatus = tasks.reduce((acc, task) => {
        const status = acc.find(s => s.id === task.id_status);
        if (!status) {
            acc.push({
                id: task.id_status,
                tasks: [task],
            });
        } else {
            status.tasks.push(task);
        }
        return acc;
    }, []);

    return tasksByStatus;
}

// exports.updateOrder = async (req, res) => {
//     const { taskId, id_status, id_sprint, sourceIndex, destIndex, destinationStatus } = req.body;
//
//     try {
//         // Lấy task cần cập nhật
//         const task = await Task.findByPk(taskId);
//         if (!task) {
//             return res.status(404).json({ error: 'Task not found' });
//         }
//
//         const lastStatusId = task.id_status;
//
//         // Lấy tất cả tasks trong mảng nguồn (nếu khác mảng đích)
//         if (lastStatusId !== destinationStatus) {
//             const tasksInSourceStatus = await Task.findAll({
//                 where: { id_status: lastStatusId, id_sprint },
//                 order: [['index', 'ASC']],
//             });
//
//             // Loại bỏ task khỏi mảng nguồn
//             const updatedSourceTasks = tasksInSourceStatus.filter(t => t.id !== taskId);
//
//             // Cập nhật lại `index` cho mảng nguồn
//             await Promise.all(
//                 updatedSourceTasks.map((t, index) => t.update({ index }))
//             );
//         }
//
//         // Cập nhật `id_status` của task nếu cần và lưu lại
//         if (task.id_status !== destinationStatus) {
//             task.id_status = destinationStatus;
//             await task.save(); // Lưu thay đổi id_status
//         }
//
//         // Lấy tất cả tasks trong mảng đích
//         const tasksInDestinationStatus = await Task.findAll({
//             where: { id_status: destinationStatus, id_sprint },
//             order: [['index', 'ASC']],
//         });
//
//         // Thêm task vào vị trí mới trong mảng đích
//         const updatedDestinationTasks = [...tasksInDestinationStatus];
//         updatedDestinationTasks.splice(destIndex, 0, task);
//
//         // Cập nhật lại `index` cho mảng đích
//         await Promise.all(
//             updatedDestinationTasks.map((t, index) => t.update({ index }))
//         );
//
//         // Lưu lại task với thông tin mới nhất (bao gồm index)
//         task.index = destIndex;
//         await task.save();
//
//         res.json({
//             sprint_id: id_sprint,
//             task,
//             lastStatusId,
//             updated_task: {
//                 id: task.id,
//                 id_status: task.id_status,
//                 index: task.index,
//             }
//         });
//     } catch (error) {
//         console.error('Failed to update task order:', error);
//         res.status(500).json({ error: 'Failed to update task order' });
//     }
// };

exports.updateOrder = async (req, res) => {
    const { taskId, id_status, id_sprint, sourceIndex, destIndex, destinationStatus } = req.body;

    try {
        // Lấy thông tin người thao tác từ token
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findByPk(verified.id, {
            attributes: ['id', 'user_name', 'gmail', 'gender', 'avatar', 'role', 'is_active'],
        });
        const id_user_action = currentUser.id;

        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const lastStatusId = task.id_status;
        let actionName;

        if (lastStatusId !== destinationStatus) {
            const oldStatus = await Status.findByPk(lastStatusId, { attributes: ['name'] });
            const newStatus = await Status.findByPk(destinationStatus, { attributes: ['name'] });

            // Xử lý các items trong status cũ và mới
            const tasksInSourceStatus = await Task.findAll({
                where: { id_status: lastStatusId, id_sprint },
                order: [['index', 'ASC']],
            });

            await Promise.all(
                tasksInSourceStatus.map(async (t) => {
                    if (t.index > sourceIndex) {
                        await t.update({ index: t.index - 1 });
                    }
                })
            );

            const tasksInDestinationStatus = await Task.findAll({
                where: { id_status: destinationStatus, id_sprint },
                order: [['index', 'ASC']],
            });

            await Promise.all(
                tasksInDestinationStatus.map(async (t) => {
                    if (t.index >= destIndex) {
                        await t.update({ index: t.index + 1 });
                    }
                })
            );

            task.id_status = destinationStatus;
            task.index = destIndex;
            await task.save();

            actionName = `${currentUser.user_name} changed task ${task.no_task} from status ${oldStatus.name} to ${newStatus.name}`;
        } else {
            const tasksInSameStatus = await Task.findAll({
                where: { id_status: lastStatusId, id_sprint },
                order: [['index', 'ASC']],
            });

            if (sourceIndex < destIndex) {
                await Promise.all(
                    tasksInSameStatus.map(async (t) => {
                        if (t.index > sourceIndex && t.index <= destIndex) {
                            await t.update({ index: t.index - 1 });
                        }
                    })
                );
            } else if (sourceIndex > destIndex) {
                await Promise.all(
                    tasksInSameStatus.map(async (t) => {
                        if (t.index >= destIndex && t.index < sourceIndex) {
                            await t.update({ index: t.index + 1 });
                        }
                    })
                );
            }

            task.index = destIndex;
            await task.save();

            actionName = `${currentUser.user_name} updated task order for ${task.no_task}`;
        }

        // if (id_user_action !== task.id_reporter) {
        await Action.create({
            id_user_action,
            id_user_receiver: task.id_reporter,
            id_task: task.id,
            name: actionName,
            id_agent: task.id,
            type_agent: 'task'
        });
        // }

        // if (id_user_action !== task.id_assignee) {
        await Action.create({
            id_user_action,
            id_user_receiver: task.id_assignee,
            id_task: task.id,
            name: actionName,
            id_agent: task.id,
            type_agent: 'task'
        });
        // }

        // Lấy lại danh sách các tasks trong status cũ và mới
        const finalSourceTasks = lastStatusId === destinationStatus ? [] : await Task.findAll({
            where: { id_status: lastStatusId, id_sprint },
            order: [['index', 'ASC']],
        });

        const finalDestinationTasks = await Task.findAll({
            where: { id_status: destinationStatus, id_sprint },
            order: [['index', 'ASC']],
        });

        res.json({
            sprint_id: id_sprint,
            task,
            lastStatusId,
            updated_task: {
                id: task.id,
                id_status: task.id_status,
                index: task.index,
            },
            updatedTasksByStatus: {
                [lastStatusId]: finalSourceTasks,
                [destinationStatus]: finalDestinationTasks,
            }
        });
    } catch (error) {
        console.error('Failed to update task order:', error);
        res.status(500).json({ error: 'Failed to update task order' });
    }
};