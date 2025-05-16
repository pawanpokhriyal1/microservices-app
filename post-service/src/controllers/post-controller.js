const Post = require('../models/Post');
const logger = require('../utils/logger');
const { publishEvent } = require('../utils/rabbitmq');
const { validateCreatePost } = require("../utils/validation");


async function invalidatePostCache(req, input) {
    const cachedKey = `post:${input}`;
    await req.redisClient.del(cachedKey)
    const keys = await req.redisClient.keys("posts:*");
    if (keys.length > 0) {
        await req.redisClient.del(keys)
    }
}

async function invalidateSearchCache(req) {
    const cachedKey = `search`;
    await req.redisClient.del(cachedKey)
}

const createPost = async (req, res) => {
    try {
        logger.info('Create Post End Point Hit ... !');
        const user = req.user;
        delete req.user;
        const { value, error } = validateCreatePost(req.body);
        if (error) {
            logger.warn('Validation error', { error: error.details[0].message });
            return res.status(400).json({ // Changed from 404 to 400 (Bad Request)
                success: false,
                message: error.details[0].message
            });
        }

        const { content, mediaIds } = value;

        const newlyCreatedPost = new Post({
            user: user.userId,
            content,
            mediaIds: mediaIds || []
        })

        await newlyCreatedPost.save();

        await publishEvent('post.created', {
            postId: newlyCreatedPost._id.toString(),
            userId: newlyCreatedPost.user.toString(),
            content: newlyCreatedPost.content,
            createdAt: newlyCreatedPost.createdAt
        })
        await invalidatePostCache(req, newlyCreatedPost._id.toString())
        await invalidateSearchCache(req);
        logger.info('Post created successfully')
        return res.status(201).json({
            success: true,
            message: 'Post created successfully'
        })
    } catch (error) {
        logger.error('Error creating post', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating post'
        })
    }
}

const getAllPost = async (req, res) => {
    try {
        console.log("req", req.query)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:${page}:${limit}`;

        const cachedPosts = await req.redisClient.get(cacheKey);

        if (cachedPosts) {
            return res.json(JSON.parse(cachedPosts));
        }

        const posts = await Post.find({}).sort({ createdAt: -1 }).skip(startIndex).limit(limit);

        const totalNoOfPosts = await Post.countDocuments();

        const result = {
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalNoOfPosts / limit),
            totalPosts: totalNoOfPosts
        }
        console.log("result", result);
        //save your posts in redis cache
        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

        return res.json(result);


    } catch (error) {
        logger.error('Error fetching posts', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching post list'
        })
    }
}

const getPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const cacheKey = `post:${postId}`;
        const cachedPost = await req.redisClient.get(cacheKey);
        console.log("cachedPost", cachedPost)
        console.log("postId", postId)
        console.log("cacheKey", cacheKey)

        if (cachedPost) {
            console.log("cachedPost", cachedPost)
            return res.json({
                success: true,
                data: JSON.parse(cachedPost)
            });
        }
        const singlePostDetailsById = await Post.findById(postId);

        if (!singlePostDetailsById) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            })
        }

        await req.redisClient.setex(cacheKey, 3600, JSON.stringify(singlePostDetailsById))
        return res.status(200).json({
            success: true,
            data: singlePostDetailsById
        })

    } catch (error) {
        logger.error('Error fetching post', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching post detail'
        })
    }
}

const deletePost = async (req, res) => {
    try {
        const post = await Post.findOneAndDelete({ _id: req.params.id, user: req.user.userId })
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            })
        }

        //publish post delete event method

        await publishEvent('post.deleted', {
            postId: post._id.toString(),
            userId: req.user.userId,
            mediaIds: post.mediaIds
        })



        //invalidate cache
        await invalidatePostCache(req, req.params.id);
        await invalidateSearchCache(req);

        return res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        })
    } catch (error) {
        logger.error('Error while deleting post', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting post detail'
        })
    }
}

module.exports = { createPost, getAllPost, getPost, deletePost }