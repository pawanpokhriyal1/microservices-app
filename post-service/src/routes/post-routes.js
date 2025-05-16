const express=require('express');

const {createPost, getAllPost, getPost, deletePost}=require('../controllers/post-controller')
const {authenticationRequest}=require('../middleware/authMiddleware')

const router=express.Router()

// middleware -->this will tell if the user is an auth user or not

router.use(authenticationRequest);

router.post('/create-post',createPost);
router.get('/all-posts',getAllPost);
router.get('/:id',getPost);
router.delete('/:id',deletePost);

module.exports=router;

