// const Media = require("../models/Media");
// const { deleteMediaFromCloudinary } = require("../utils/cloudinary");

// const handlePostDeleted = async (event) => {
//     console.log("event", event);
//     const { postId, mediaIds } = event;
//     try {

//         const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
//         for (const media of mediaToDelete) {
//             console.log("media", media)
//             const cloudinaryResult = await deleteMediaFromCloudinary(media.publicId);
//             console.log("cloudinaryResult",cloudinaryResult)
//             if (cloudinaryResult.result === 'ok' || cloudinaryResult.result === 'not found') {
//                 logger.info('Cloudinary deletion successful', { result: cloudinaryResult });
//             } else {
//                 logger.warn('Unexpected Cloudinary response', cloudinaryResult);
//             }
//             await Media.findByIdAndDelete(media._id);
//             logger.info(`Deleted  media ${media._id} associated with this deleted post ${postId}`);

//         }
//         logger.info(`Processed deletion of media for post id ${postId}`);
//     } catch (error) {
//         logger.error(error, 'Error occured while media  deletion')
//     }
// }

// module.exports = { handlePostDeleted };

const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDeleted = async (event) => {
    logger.info("Processing post deletion", { event });
    const { postId, mediaIds } = event;
    
    try {
        const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
        
        // Process each media sequentially with proper error handling
        await Promise.all(mediaToDelete.map(async (media) => {
            try {
                logger.info(`Deleting media ${media._id}`, { publicId: media.publicId });
                
                const cloudinaryResult = await deleteMediaFromCloudinary(media.publicId);
                logger.debug("Cloudinary response", cloudinaryResult);
                
                if (cloudinaryResult.result !== 'ok' && cloudinaryResult.result !== 'not found') {
                    logger.warn("Unexpected Cloudinary response", cloudinaryResult);
                }
                
                await Media.findByIdAndDelete(media._id);
                logger.info(`Successfully deleted media ${media._id}`);
                
            } catch (mediaError) {
                logger.error(`Failed to delete media ${media._id}`, {
                    error: mediaError.message,
                    stack: mediaError.stack
                });
                // Continue to next media even if one fails
            }
        }));
        
        logger.info(`Completed media deletion for post ${postId}`);
    } catch (error) {
        logger.error('Critical error in handlePostDeleted', {
            error: error.message,
            stack: error.stack,
            postId
        });
        throw error; // Ensure the error propagates to RabbitMQ
    }
};

module.exports = { handlePostDeleted };