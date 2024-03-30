const express = require('express');
const router = express.Router();
const Post = require('./PostModel');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./UserModel');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;


router.use(passport.initialize());

// Configure JWT strategy
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'secret'
}, async (jwtPayload, done) => {
    try {
        const user = await User.findById(jwtPayload.user.id);

        if (!user) {
            return done(null, false);
        }

        return done(null, user);
    } catch (err) {
        return done(err, false);
    }
}));

// Middleware to check if user is authenticated
const isAuthenticated = passport.authenticate('jwt', { session: false });

// Create a new post
router.post('/posts', isAuthenticated, [
    body('title').notEmpty(),
    body('body').notEmpty(),
    body('latitude').notEmpty().isNumeric(),
    body('longitude').notEmpty().isNumeric(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, body, latitude, longitude } = req.body;
        const createdBy = req.user._id;

        const post = new Post({
            title,
            body,
            createdBy,
            latitude,
            longitude,
            active: true,
        });

        await post.save();
        res.status(201).json({ msg: 'Successfully created a new post' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Retrieve all posts of the authenticated user
router.get('/posts', isAuthenticated, async (req, res) => {
    try {
        const posts = await Post.find({ createdBy: req.user._id });
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update a post
router.put('/posts/:id', isAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Ensure user can only update their own posts
        if (post.createdBy.toString() !== req.user._id.toString()) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Update fields
        post.title = req.body.title || post.title;
        post.body = req.body.body || post.body;
        post.latitude = req.body.latitude || post.latitude;
        post.longitude = req.body.longitude || post.longitude;
        post.active = req.body.active || post.active;

        await post.save();
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Delete a post
router.delete('/posts/:id', isAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Ensure user can only delete their own posts
        if (post.createdBy.toString() !== req.user._id.toString()) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await post.remove();
        res.json({ msg: 'Post removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/posts/:latitude/:longitude', async (req, res) => {
    try {
        const latitude = parseFloat(req.params.latitude);
        const longitude = parseFloat(req.params.longitude);

        const posts = await Post.find({
            location: {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                }
            }
        });

        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/dashboard', async (req, res) => {
    try {
        const activeCount = await Post.countDocuments({ active: true });
        const inactiveCount = await Post.countDocuments({ active: false });

        res.json({ activeCount, inactiveCount });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Configure local strategy
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        let user = await User.findOne({ email });

        if (!user) {
            return done(null, false, { message: 'Invalid email' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return done(null, false, { message: 'Invalid password' });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Register a new user
router.post('/register', [
    body('username').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, email, password } = req.body;

        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            username,
            email,
            password
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload, 'secret', { expiresIn: 3600 }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// Authenticate user and get token
router.post('/login', async (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.status(400).json({ msg: info.message });
        }

        req.login(user, { session: false }, (err) => {
            if (err) {
                return next(err);
            }

            const payload = {
                user: {
                    id: user.id
                }
            };

            jwt.sign(payload, 'secret', { expiresIn: 3600 }, (err, token) => {
                if (err) throw err;
                res.json({ token });
            });
        });
    })(req, res, next);
});


module.exports = router;
