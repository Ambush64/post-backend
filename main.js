const express = require('express');
const connectDB = require('./db');
const bodyParser = require('body-parser');
const cors = require('cors');

// Import routers
// const blogPostRouter = require('./blogPost');
const PostRouter = require('./posts');


// Initialize express app
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/', PostRouter);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
