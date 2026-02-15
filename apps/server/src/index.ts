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
});
