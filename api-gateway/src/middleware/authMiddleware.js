const logger = require("../utils/logger");
const jwt = require('jsonwebtoken')

const validateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        logger.warn("Accept attempt without valid token !");
        return res.status(401).json({
            success: false,
            message: 'Authentication is required'
        })
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.warn("Invalid token !");
            return res.status(429).json({
                success: false,
                message: 'Invalid Token !'
            })
        }
        req.user = user;
        next();
    })
   
}

module.exports={validateToken}