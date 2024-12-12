const User = require('../models/User');
const Comment = require('../models/Comment');
const { Op } = require('sequelize');

exports.addComment = async (req, res) => {
    try {
        const { id_user, id_task, text } = req.body;

        // Kiểm tra dữ liệu
        if (!id_user || !id_task || !text) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: id_user, id_task, or text',
            });
        }

        // Tạo comment
        const newComment = await Comment.create({ id_user, id_task, text });

        const commentWithUser = await Comment.findByPk(newComment.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                },
            ],
        });

        res.status(201).json({
            success: true,
            commentWithUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment',
        });
    }
}

exports.updateComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        // Kiểm tra dữ liệu
        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Field "text" is required.',
            });
        }

        // Tìm comment
        const comment = await Comment.findByPk(id);
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        // Cập nhật nội dung
        await comment.update({ text });

        // Lấy lại comment với thông tin user
        const updatedCommentWithUser = await Comment.findByPk(comment.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                },
            ],
        });

        res.status(200).json({
            success: true,
            updatedCommentWithUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to update comment',
        });
    }
};

exports.deleteComments = async (req, res) => {
    try {
        let { ids } = req.body; // Chấp nhận xóa nhiều comment cùng lúc

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

        const existingIds = await Comment.findAll({
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

        // Xóa comment
        await Comment.destroy({ where: { id: ids } });

        res.status(200).json({
            success: true,
            message: 'Comments deleted successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete comments',
        });
    }
}

exports.deleteComment = async (req, res) => {
    try {
        const { id } = req.params;

        // Tìm comment
        const comment = await Comment.findByPk(id);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found',
            });
        }

        // Xóa comment
        await comment.destroy();

        // Trả về id của comment đã xóa
        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully',
            data: { id },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete comment',
        });
    }
};

exports.getListCommentByTaskId = async (req, res) => {
    try {
        const { id_task } = req.params;

        const comments = await Comment.findAll({
            where: { id_task: id_task },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'user_name', 'gmail', 'avatar'],
                },
            ],
            order: [['created_at', 'ASC']],
        });

        res.status(200).json({
            success: true,
            data: comments,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments',
        });
    }
}

exports.getCommentById = exports.getCommentById = async (req, res) => {
    const { id } = req.params;

    try {
        const comment = await Comment.findOne({
            where: { id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'user_name', 'gmail', 'avatar'],
                },
            ],
        });

        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        return res.status(200).json({ success: true, data: comment });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to get comment' });
    }
};
