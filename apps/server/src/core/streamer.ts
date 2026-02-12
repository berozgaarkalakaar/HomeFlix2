import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { mediaItems } from '../db/schema';
import { eq } from 'drizzle-orm';

export class StreamController {
    async streamMedia(req: Request, res: Response) {
        const { id } = req.params;

        const item = await db.query.mediaItems.findFirst({
            where: eq(mediaItems.id, id),
        });

        if (!item) {
            return res.status(404).send('Media not found');
        }

        const filePath = item.path;

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found on disk');
        }

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
                'Content-Type': 'video/mp4', // Simplification for MVP
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
    }
}

export const streamer = new StreamController();
