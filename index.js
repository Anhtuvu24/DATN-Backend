const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDB, sequelize } = require('./src/config/database');
const defineAssociations = require('./src/models/associations');
const timezoneMiddleware = require('./src/middlewares/timezone');
require('./src/config/firebase')

// Routes
const userRoutes = require('./src/routes/userRoutes');
const projectTypeRoutes = require('./src/routes/projectTypeRoutes');
const statusRoutes = require('./src/routes/statusRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const sprintRoutes = require('./src/routes/sprintRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const actionRoutes = require('./src/routes/actionRoutes');
const fileRoutes = require('./src/routes/fileRoutes');

require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(timezoneMiddleware);

app.use(cors({
    origin: ['http://localhost:5173', 'https://c441-14-162-4-3.ngrok-free.app'], // Địa chỉ của ứng dụng React
    methods: 'GET,POST,PUT,DELETE',
    credentials: true
}));

defineAssociations();

sequelize.sync({ alter: true })
    .then(() => {
        console.log('Database & tables created!');
    })
    .catch((error) => {
        console.error('Unable to create tables:', error);
    });

app.use('/api/users', userRoutes);
app.use('/api/project-type', projectTypeRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/sprint', sprintRoutes);
app.use('/api/task', taskRoutes);
app.use('/api/comment', commentRoutes);
app.use('/api/action', actionRoutes);
app.use('/api/file', fileRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server is running on http://localhost:${PORT}`);
});
