const express = require('express');
const cluster = require('cluster');
const os = require('os');
const process = require('process');

const port = 5000;
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log(`Number of CPUs: ${numCPUs}`);
    console.log(`Master process PID: ${process.pid}`);

    // Fork worker processes
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Log when a worker process exits and fork a new one
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
        console.log(`Forking a new worker...`);
        cluster.fork();
    });
} else {
    // Worker process logic
    startExpress();
}

function startExpress() {
    const app = express();
    console.log(`Worker process PID: ${process.pid}`);

    // Handle incoming requests
    app.get('/', (req, res) => {
        setTimeout(() => {
            res.send('Hello World from Worker ' + process.pid);

        }, 5000); // Delay response by 5 seconds
    });

    app.get('/busy', (req, res) => {
        console.log(`Worker ${process.pid} is busy...`);
        // Simulate a busy computation by delaying the response
        setTimeout(() => {
            res.send('Busy response from Worker ' + process.pid);
        }, 5000); // Delay response by 5 seconds
    });

    // Start the Express server
    app.listen(port, () => {
        console.log(`Worker process ${process.pid} is listening on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log(`Worker process ${process.pid} received SIGINT signal. Shutting down...`);
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log(`Worker process ${process.pid} received SIGTERM signal. Shutting down...`);
        process.exit(0);
    });
}
