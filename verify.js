const jwt = require('jsonwebtoken');
const JWT_SECRET = "THISISJWT_SECRET"

// Middleware function to verify token
const verifyToken = (req, res, next) => {
    // Get the token from the request headers
    const authHeader = req.headers.authorization;

    // Check if authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token not provided' });
    }

    // Extract the token part from the authorization header
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        next();
    } catch (error) {
        // Handle invalid or expired token
        console.error('Error verifying token:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = verifyToken;
