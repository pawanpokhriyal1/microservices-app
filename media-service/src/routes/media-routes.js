const express = require('express');
const multer = require('multer')

const { uploadMedia,getAllMedias } = require('../controllers/media-controller');
const { authenticationRequest } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const router = express.Router();


// configure multer for file upload

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
}).single('file')

router.post('/upload', authenticationRequest, (req, res, next) => {
    upload(req, res, function (err) {

        if (err instanceof multer.MulterError) {

            logger.error('Multer error while uploading :', err);

            return res.status(400).json({
                message: 'Multer error whiile uploading',
                error: err.message,
                stack: err.stack
            })
        }
        else if (err) {
            logger.error('Unknown error occured while uploading :', err);

            return res.status(400).json({
                message: 'Unknown error occured while uploading :',
                error: err.message,
                stack: err.stack
            })
        }
        if (!req.file) {
            return res.status(400).json({
             message: 'No file fopund',
            })
        }
        next()
    })
},uploadMedia)

router.get("/get",authenticationRequest,getAllMedias);

module.exports=router