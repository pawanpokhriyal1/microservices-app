// const User = require('../models/User');
// const generateTokens = require('../utils/generateTokens');
// const logger = require('../utils/logger')
// const { validateRegistration } = require('../utils/validation')
// // user registration 

// const registerUser = async (req, res) => {
//     logger.info('Registration request ')
//     try {
//         // validate  the schema
//         const { error, value } = validateRegistration(req.body);

//         if (error) {
//             logger.warn('Validation error', error.details[0].message);
//             return res.status(404).json({
//                 success: false,
//                 message: error.details[0].message
//             })
//         }
//         const { email, password, username } = req.body;

//         let user = await User.findOne({ $or: [{ email }, { username }] });
//         console.log("user:::*****",user);

//         if (user) {
//             logger.warn("user already exists");
//             return res.status(400).json({
//                 success: false,
//                 message: 'User Already Exits'
//             })
//         }

//         user = new User({ username, email, password })
//         await user.save();
//         logger.info("User Registered Successfully", user._id)

//         const { accessToken, refreshToken } = await generateTokens(user);

//         return res.status(201).json({
//             success: true,
//             message: "User is Registered  Successfully !",
//             accessToken,
//             refreshToken,
//         })

//     } catch (error) {
//         logger.error("Registration error occurred", error);
//         return res.status(500).json({
//             success:false,
//             message:'Internal Server Error'
//         })
//     }
// }

// module.exports={registerUser};



const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const generateTokens = require('../utils/generateTokens');
const logger = require('../utils/logger');
const { validateRegistration,validateLogin } = require('../utils/validation');


// user registration
const registerUser = async (req, res) => {
    logger.info('Registration request received', { body: req.body });

    try {
        // Validate the request body
        const { error, value } = validateRegistration(req.body);
        if (error) {
            logger.warn('Validation error', { error: error.details[0].message });
            return res.status(400).json({ // Changed from 404 to 400 (Bad Request)
                success: false,
                message: error.details[0].message
            });
        }

        const { email, password, username } = value; // Use validated value

        // Check for existing user with transaction-like safety
        let user;
        try {
            user = await User.findOne({ $or: [{ email }, { username }] });
        } catch (dbError) {
            throw new Error('Database operation failed');
        }

        if (user) {
            logger.warn('User already exists', { email, username });
            return res.status(409).json({ // 409 Conflict for duplicate resources
                success: false,
                message: 'User already exists'
            });
        }

        // Create and save new user
        user = new User({ username, email, password });
        await user.save();
        logger.info('User registered successfully', { userId: user._id });

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(user);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                userId: user._id,
                username: user.username,
                email: user.email
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        logger.error('Registration error', {
            error: error.message,
            stack: error.stack
        });

        // More specific error messages
        const errorMessage = error.message.includes('Database operation')
            ? 'Service temporarily unavailable'
            : 'Internal server error';

        return res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
};

//user login

const loginUser = async (req, res) => {
    logger.info("Login endpoint hit....");
    try {
        const { error, value } = validateLogin(req.body);
        if (error) {
            logger.warn('Validation error', { error: error.details[0].message });
            return res.status(400).json({ // Changed from 404 to 400 (Bad Request)
                success: false,
                message: error.details[0].message
            });
        }

        const { email, password } = value; // Use validated value

        // Check for existing user with transaction-like safety
        let user;
        try {
            user = await User.findOne({ email });
        } catch (dbError) {
            throw new Error('Database operation failed');
        }

        if (!user) {
            logger.warn('Invalid User');
            return res.status(400).json({
                success: false,
                message: 'Invalid Credentials'
            });
        }
        // user valid password or not
        const isValidPassword = await user.comparePassword(password)

        if (!isValidPassword) {
            logger.warn('Invalid Password');
            return res.status(400).json({
                success: false,
                message: 'Invalid Password'
            });
        }
        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(user);

        return res.status(200).json({
            success: true,
            message: 'User Login successfully',
            userId: user._id,
            accessToken,
            refreshToken
        });


    } catch (error) {
        logger.error('Login  error occured', {
            error: error.message,
            stack: error.stack
        });
        // More specific error messages
        const errorMessage = error.message.includes('Database operation')
            ? 'Service temporarily unavailable'
            : 'Internal server error';
        return res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
}

// user Refresh token 

const userRefreshToken=async(req,res)=>{
    try {
        const {refreshToken}=req.body;
        if(!refreshToken){
            logger.warn('Refresh token missing');
            return res.status(400).json({
                success:false,
                message:"Refresh token missing"
            })
        }
        const storedToken=await RefreshToken.findOne({token:refreshToken});

        if(!storedToken||storedToken.expiresAt<new Date()){
            logger.warn('Invalid or expired refresh token');

            return res.status(401).json({
                success:false,
                message:`Invalid or expired refresh Token`
            })
        }

        const user =await User.findById(storedToken.user);

        if(!user){
            logger.warn("User not found");

            return res.status(401).json({
                success:false,
                message:'user not found'
            })
        }

        const {accessToken:newAcessToken,refreshToken:newRefreshToken}=await generateTokens(user);

        //delete the old refresh token
        await RefreshToken.deleteOne({_id:storedToken._id});

        return res.status(200).json({
            success:true,
            accessToken:newAcessToken,
            refreshToken:newRefreshToken
        })

        
    } catch (error) {
        logger.error("Refresh token occured",e);
        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}


// logout

const logoutUser=async(req,res)=>{
    logger.info("Logout endpoint hit.....");
    try {
        const {refreshToken}=req.body;
        if(!refreshToken){
            logger.warn("Refresh token missing");
            return res.status(400).json({
                success:false,
                message:"Refresh token missing"
            })
        }
        await RefreshToken.deleteOne({token:refreshToken});
        logger.info('Refresh Token deleted for logout')

        return res.status(200).json({
            success:true,
            message:"Logged out successfully"
        })
    } catch (error) {
        logger.error("Error while logging out",error);
        return res.status(500).json({
            success:false,
            message:"Internal server error"
        })
    }
}

module.exports = { registerUser ,loginUser,userRefreshToken,logoutUser};