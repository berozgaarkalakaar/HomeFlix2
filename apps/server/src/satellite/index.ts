import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import os from 'os';

const app = express();
const PORT = 3100; // Satellite runs on 3100 by default

app.use(cors());
app.use(express.json());

// Basic Auth Middleware (Simple Token)
// In a real scenario, this would be generated on first run and shown to user
const ACCESS_TOKEN = 'homeflix-satellite';

const auth = (req: any, res: any, next: any) => {
    const token = req.headers['authorization'];
    if (token === `Bearer ${ACCESS_TOKEN}`) return next();
    // Allow query param for streaming
    if (req.query.token === ACCESS_TOKEN) return next();
    res.status(401).json({ error: 'Unauthorized' });
};

// 1. Handshake / Info
app.get('/info', (req, res) => {
    res.json({
        name: os.hostname(),
        platform: os.platform(),
        version: '1.0.0',
        type: 'satellite'
    });
});

// 2. List Drives (Windows specific mostly, but works generally)
app.get('/drives', auth, (req, res) => {
    // Basic root listing
    try {
        if (os.platform() === 'win32') {
            // Quick hack to find drives on Windows without native modules
            // We can just execute a wmic command or checked common letters
            // consistent with "no native deps" philosophy
            const exec = require('child_process').exec;
            exec('wmic logicaldisk get name', (error: any, stdout: any) => {
                if (error) return res.json(['C:/']);
                const drives = stdout.split('\r\r\n')
                    .filter((value: string) => /[A-Za-z]:/.test(value))
                    .map((value: string) => value.trim() + '/'); // Add slash for path consistency
                res.json(drives);
            });
        } else {
            res.json(['/']);
        }
    } catch (e) {
        res.json(['/']);
    }
});

// 3. List Files (Recursive or Shallow? Shallow is safer for UI navigation)
app.post('/list', auth, (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath || typeof folderPath !== 'string') return res.status(400).json({ error: 'Invalid path' });

    try {
        const items = fs.readdirSync(folderPath, { withFileTypes: true });
        const result = items.map(item => {
            let size = 0;
            try {
                if (!item.isDirectory()) {
                    size = fs.statSync(path.join(folderPath, item.name)).size;
                }
            } catch (e) {
                console.error(`Error stat-ing file ${item.name}:`, e);
            }
            return {
                name: item.name,
                isDirectory: item.isDirectory(),
                path: path.join(folderPath, item.name),
                size
            };
        });
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Stream File
app.get('/stream', auth, (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('File not found');

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4', // Generic, client can sniff
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=== HomeFlix Satellite ===`);
    console.log(`Running on port ${PORT}`);
    console.log(`Machine: ${os.hostname()}`);
    console.log(`Status: Ready for connection.`);
    console.log(`\nKeep this window open!`);
});
