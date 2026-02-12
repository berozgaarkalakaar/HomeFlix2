import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';
import { db } from '../db';
import { images, mediaItems } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const IMAGE_CACHE_DIR = path.join(process.cwd(), 'cache', 'images');

export class ImageManager {
    constructor() {
        fs.ensureDirSync(IMAGE_CACHE_DIR);
    }

    async generatePoster(mediaItemId: string, filePath: string, duration: number = 0) {
        // Check if poster exists
        const existing = await db.query.images.findFirst({
            where: and(eq(images.mediaItemId, mediaItemId), eq(images.type, 'poster')),
        });
        if (existing) return;

        const outputAndFilename = this.getOutputPath(mediaItemId, 'poster.jpg');
        // Ensure subdir exists
        await fs.ensureDir(path.dirname(outputAndFilename));

        // Timestamp at 10% or 10s, whichever is larger but not > 50%
        let timestamp = Math.max(10, duration * 0.1);
        if (timestamp > duration) timestamp = duration / 2;

        return new Promise<void>((resolve, reject) => {
            ffmpeg(filePath)
                .screenshots({
                    timestamps: [timestamp],
                    filename: 'poster.jpg',
                    folder: path.dirname(outputAndFilename),
                    size: '600x?', // simple resize
                })
                .on('end', async () => {
                    await db.insert(images).values({
                        id: uuidv4(),
                        mediaItemId,
                        type: 'poster',
                        path: outputAndFilename,
                        size: 'medium',
                    });
                    console.log(`Generated poster for ${mediaItemId}`);
                    resolve();
                })
                .on('error', (err) => {
                    console.error(`Failed to generate poster for ${mediaItemId}:`, err);
                    reject(err);
                });
        });
    }

    getOutputPath(mediaItemId: string, filename: string) {
        return path.join(IMAGE_CACHE_DIR, mediaItemId, filename);
    }
}

export const imageManager = new ImageManager();
