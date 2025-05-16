const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    if (err) {
        logger.error(err.stack);
        return res.status(err.status || 500).json({
            message: err.message || "Internal Server Error",
        })
    }
    next();
}

module.exports = errorHandler;