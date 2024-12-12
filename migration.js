// module.exports = {
//     up: async (queryInterface, Sequelize) => {
//         await queryInterface.createTable('project', {
//             id: {
//                 type: Sequelize.UUID,
//                 defaultValue: Sequelize.UUIDV4,
//                 allowNull: false,
//                 primaryKey: true,
//             },
//             id_type: {
//                 type: Sequelize.UUID,
//                 allowNull: false,
//                 references: {
//                     model: 'project_type', // Tên bảng của ProjectType
//                     key: 'id',
//                 },
//                 onDelete: 'CASCADE',
//             },
//             id_lead: {
//                 type: Sequelize.UUID,
//                 allowNull: false,
//                 references: {
//                     model: 'user', // Tên bảng của User
//                     key: 'id',
//                 },
//                 onDelete: 'CASCADE',
//             },
//             name: {
//                 type: Sequelize.STRING,
//                 allowNull: false,
//             },
//             key: {
//                 type: Sequelize.STRING,
//                 allowNull: false,
//                 unique: true,
//             },
//             icon: {
//                 type: Sequelize.STRING,
//                 allowNull: true,
//             },
//             is_favorite: {
//                 type: Sequelize.BOOLEAN,
//                 defaultValue: false,
//             },
//             created_at: {
//                 type: Sequelize.DATE,
//                 defaultValue: Sequelize.NOW,
//             },
//             updated_at: {
//                 type: Sequelize.DATE,
//                 defaultValue: Sequelize.NOW,
//             },
//         });
//     },
//
//     down: async (queryInterface) => {
//         await queryInterface.dropTable('project');
//     },
// };
