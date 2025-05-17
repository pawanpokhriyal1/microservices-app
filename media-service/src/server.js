require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const mediaRoutes = require('./routes/media-routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { connectToRabbitMQ, consumeEvent } = require('./utils/rabbitmq');
const { handlePostDeleted } = require('./eventHandlers/media-event-handlers');

const app = express();
const PORT = process.env.PORT;



mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
    .then(() => logger.info('Connected to mongoDb'))
    .catch(e => logger.error('Mongo connection error', e))

app.use(helmet());
app.use(cors())
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body ,${req.body}`);
    next();
})


app.use('/api/media', mediaRoutes)



async function startServer() {
    try {
        await connectToRabbitMQ();

        //consume all the events 
        await consumeEvent('post.deleted',handlePostDeleted)

        app.listen(PORT, () => {
            logger.info(`Media service running on port ${PORT}`);
        })

    } catch (error) {
        logger.error('Failed to connect to server', error);
        process.exit(1);
    }
}

startServer();


// unhandled promise rejection

process.on('unhandledRejection', (reason, promise) => {
    logger.error('unhandledRejection at', promise, "reason:", reason)
})
