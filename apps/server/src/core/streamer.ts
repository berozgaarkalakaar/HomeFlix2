import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { mediaItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import ffmpeg from 'fluent-ffmpeg';

export class StreamController {
    async streamMedia(req: Request, res: Response) {
        const { id } = req.params;
        const targetHeight = req.query.height ? parseInt(req.query.height as string) : null;

        const item = await db.query.mediaItems.findFirst({
            where: eq(mediaItems.id, id),
        });

        if (!item) {
            return res.status(404).send('Media not found');
        }

        const filePath = item.path;
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }

        const ext = path.extname(filePath).toLowerCase();
        const isCompatibleContainer = ext === '.mp4';

        if (isCompatibleContainer && (item.codec === 'h264' || !item.codec) && !targetHeight) {
            // Direct Stream (supports seeking)
            return this.streamDirect(req, res, filePath);
        }

        // Transcoding Path (MKV, HEVC, AVI, etc.)
        console.log(`[Streamer] Transcoding ${id} (${ext}) -> Height: ${targetHeight || 'Original'}`);

        res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Transcode': 'active'
        });

        let videoFilter = 'format=yuv420p';
        if (targetHeight) {
            videoFilter += `,scale=-2:${targetHeight}`;
        }

        const command = ffmpeg(filePath)
            .format('mp4')
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-movflags frag_keyframe+empty_moov+default_base_moof',
                '-preset ultrafast',
                '-crf 23',
                '-tune zerolatency',
                '-max_muxing_queue_size 1024'
            ])
            .outputOptions(['-vf', videoFilter])
            .on('start', (cmd) => {
                console.log('[FFmpeg] Started:', cmd);
            })
            .on('error', (err) => {
                if (err.message !== 'Output stream closed') {
                    console.error('[FFmpeg] Error:', err.message);
                }
                res.end();
            });

        command.pipe(res, { end: true });

        req.on('close', () => {
            console.log('[Streamer] Client closed connection, killing ffmpeg.');
            command.kill('SIGKILL');
        });
    }

    private streamDirect(req: Request, res: Response, filePath: string) {
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            // Check valid range
            if (start >= fileSize) {
                res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
                return;
            }

            const file = fs.createReadStream(filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
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
