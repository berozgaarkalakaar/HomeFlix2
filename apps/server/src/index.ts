import express from 'express';
import cors from 'cors';

const app = express();
import { Server } from '@tus/server';
import { FileStore } from '@tus/file-store';
import { handleUploadCommit } from './api/uploads';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'media', 'uploads', 'incoming');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const tusServer = new Server({
    path: '/files',
    datastore: new FileStore({ directory: UPLOAD_DIR }),
    relativeLocation: true,
});

const PORT = process.env.PORT || 3001;

import apiRoutes from './api/routes';

app.use(cors());
app.use(express.json());

// Serve Public Downloads (for Satellite executables)
const PUBLIC_DIR = path.join(process.cwd(), 'public');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
app.use('/downloads', express.static(PUBLIC_DIR));


const uploadApp = express.Router();
uploadApp.all('*', tusServer.handle.bind(tusServer));
app.use('/files', uploadApp);

import { authenticateToken } from './core/auth';

app.post('/api/v1/uploads/commit', authenticateToken, handleUploadCommit);

app.use('/api/v1', apiRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Log LAN IPs
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = Object.create(null);

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    console.log('Available on your network:');
    for (const name of Object.keys(results)) {
        for (const ip of results[name]) {
            console.log(`  http://${ip}:${PORT}`);
        }
    }
});
