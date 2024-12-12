const Auth = require('./AuthenToken');
const Project = require('./Project');
const ProjectType = require('./ProjectType');
const User = require('./User');
const Status = require('./Status');
const Sprint = require('./Sprint');
const Comment = require('./Comment')
const Task = require('./Task')
const Action = require('./Action')
const File = require('./file')

const defineAssociations = () => {
    // Quan hệ giữa Auth và User
    User.hasOne(Auth, { foreignKey: 'user_id', as: 'auth', constraints: true });
    Auth.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: true, onDelete: 'cascade' });

    // Quan hệ giữa Project và User (lead)
    User.hasMany(Project, { foreignKey: 'id_lead', as: 'project', constraints: true });
    // Project.belongsTo(User, { foreignKey: 'id_lead', as: 'lead', constraints: true, onDelete: 'cascade' });

    // Quan hệ giữa Project và ProjectType
    ProjectType.hasMany(Project, { foreignKey: 'id_type', as: 'project', constraints: true });
    // Project.belongsTo(ProjectType, { foreignKey: 'id_type', as: 'type', constraints: true, onDelete: 'cascade' });

    Project.hasMany(Sprint, {foreignKey: 'id_project', as: 'sprint', constraints: true});

    User.hasMany(Comment, { foreignKey: 'id_user', as: 'comments' });
    Task.hasMany(Comment, { foreignKey: 'id_task', as: 'comments' });

    User.hasMany(Action, { foreignKey: 'id_user_action', as: 'actionsPerformed' });
    User.hasMany(Action, { foreignKey: 'id_user_receiver', as: 'actionsReceived' });
    Task.hasMany(Action, { foreignKey: 'id_task', as: 'taskActions' });

    Task.belongsTo(Status, { foreignKey: 'id_status', as: 'status' });
    Status.hasMany(Task, { foreignKey: 'id_status', as: 'tasks' });

    Task.hasMany(File, { foreignKey: 'id_task', as: 'files' });
    Sprint.hasMany(Task, { foreignKey: 'id_sprint', as: 'tasks' });
};

module.exports = defineAssociations;
