const Media = require('../models/Media');
const { uploadMediaToCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger')

const uploadMedia = async (req, res) => {
    logger.info('Starting media upload');

    try {
        if (!req.file) {
            logger.error('No file found .Please add a file and try again !')
            return res.status(400).json({
                success: false,
                message: 'No file found.Please add a file and try again !'
            })
        }

        const { originalname, mimetype, buffer } = req.file;

        const userId = req.user.userId;

        logger.info(`File details: name=${originalname} ,type=${mimetype}`);
        logger.info('Uploading to cloudinary starting.....')

        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
        logger.info(`Cloudinary upload successfully .Public Id :- ${cloudinaryUploadResult.public_id}`);

        const newlyCreatedMedia = new Media({
            publicId: cloudinaryUploadResult.public_id,
            originalName:originalname,
            mimeType:mimetype,
            url: cloudinaryUploadResult.secure_url,
            userId
        })

        await newlyCreatedMedia.save();

        return res.status(200).json({
            success: true,
            mediaId: newlyCreatedMedia,
            url: newlyCreatedMedia.url,
            message: "Media upload is sucessful"
        })

    } catch (error) {
        logger.error('Error creating media post !',error)
        return res.status(500).json({
            success: false,
            message: 'Error creating media post!'
        })
    }

}

const getAllMedias=async(req,res)=>{
    try {
       const result =await Media.find({}) ;
       return res.status(200).json({
        success:true,
        data:result
       })
    } catch (error) {
             logger.error('Error fetching media  !',error)
        return res.status(500).json({
            success: false,
            message: 'Error Fetching media !'
        }) 
    }
}
module.exports={uploadMedia,getAllMedias}