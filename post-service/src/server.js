require('dotenv').config();

const mongoose = require('mongoose');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const postRoutes = require('./routes/post-routes');
const errorHandler = require('./middleware/errorHandler')
const logger = require('./utils/logger')
// const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { connectToRabbitMQ } = require('./utils/rabbitmq');


const app = express();
const PORT = process.env.PORT || 3002;

console.log("process.env.MONGODB_URL", process.env.MONGODB_URL)
// connect to mongoDb

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
    .then(() => logger.info('Connected to mongoDb'))
    .catch(e => logger.error('Mongo connection error', e))

const redisClient = new Redis(process.env.REDIS_URL)

//middleware
app.use(helmet());
app.use(cors())
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body ,${req.body}`);
    next();
})


// DDOs protection and rate limiter

// const rateLimiter = new RateLimiterRedis({
//     storeClient: redisClient,
//     keyPrefix: 'middleware',
//     points: 10,
//     duration: 1
// });

// app.use((req, res, next) => {
//     rateLimiter.consume(req.ip).then(() => next()).catch(() => {
//         logger.warn(`Rate limit exceeded for IP:${req.ip}`);
//         return res.status(429).json({
//             success: false,
//             message: 'Too many requests'
//         })
//     })
// })

// Ip based rate limiting for sensitive endpoints

const sensitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    leagcyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
        return res.status(429).json({ success: false, message: "Too many requests" });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    })

})


// apply this sensistiveEndpointLimiter to our routes

app.use('/api/posts/create-post', sensitiveEndpointsLimiter)

//Routes 
app.use('/api/posts', (req, res, next) => {
    req.redisClient = redisClient;
    console.log('jajs')
    next()
}, postRoutes)

app.use(errorHandler);

async function startServer() {
    try {
        await connectToRabbitMQ();
        app.listen(PORT, () => {
            logger.info(`Post service running on port ${PORT}`);
        })

    } catch (error) {
        logger.error('Failed to connect to server', error);
        process.exit(1);
    }
}

startServer();
// Add Redis client to app.locals instead:

// unhandled promise rejection

process.on('unhandledRejection', (reason, promise) => {
    logger.error('unhandledRejection at', promise, "reason:", reason)
})

