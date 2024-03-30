const express = require('express');
const router = express.Router();
const BlogPost = require('./BlogModel');
const User = require('./UserModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const verifyToken = require('./verify');


const JWT_SECRET = "THISISJWT_SECRET"

// GET specific post by postId
router.get('/posts/:postId', verifyToken, async (req, res) => {
    try {
        const postId = req.params.postId;
        const post = await BlogPost.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET all blogs
router.get('/getBlogs', verifyToken, async (req, res) => {
    try {
        const blogs = await BlogPost.find();
        res.json(blogs);
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST create new post
router.post('/posts', verifyToken, async (req, res) => {
    try {
        const { title, content, author, date, imageLink } = req.body;
        const newPost = new BlogPost({ title, content, author, date, imageLink });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST create new post
router.put('/posts/:postId', verifyToken, async (req, res) => {
    try {
        const postId = req.params.postId;
        const { title, content, author, date, imageLink } = req.body;
        await BlogPost.findOneAndUpdate({ _id: postId }, { title, content, author, date, imageLink });
        res.status(201).json({ "message": "updated" });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// DELETE blog by id
router.delete('/delete/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const deletedPost = await BlogPost.findByIdAndDelete(id);
        if (!deletedPost) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// register
router.post('/registerUser', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the email already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            username,
            password: hashedPassword
        });

        // Save the user to the database
        await newUser.save();

        res.status(201).json({ "message": "success" });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare the password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});




module.exports = router;
