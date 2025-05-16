const logger=require('../utils/logger')

const authenticationRequest=(req,res,next)=>{
    const userId=req.headers['x-user-id'];
    console.log("userId",userId)

    if(!userId){
        logger.warn('Access attempted without user ID');

        return res.status(401).json({
            success:false,
            message:'Authentication required ! Please login to continue'
        })
    }

    req.user={userId}
    next()
}

module.exports={authenticationRequest}