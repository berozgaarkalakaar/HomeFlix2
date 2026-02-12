import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';
import { db } from '../db';
import { transcodeJobs, mediaItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const HLS_CACHE_DIR = path.join(process.cwd(), 'cache', 'hls');

export class TranscodeManager {
    constructor() {
        fs.ensureDirSync(HLS_CACHE_DIR);
    }

    async startJob(mediaItemId: string): Promise<string> {
        // Check if valid item
        const item = await db.query.mediaItems.findFirst({
            where: eq(mediaItems.id, mediaItemId),
        });
        if (!item) throw new Error('Item not found');

        // Check existing job
        const existing = await db.query.transcodeJobs.findFirst({
            where: eq(transcodeJobs.mediaItemId, mediaItemId),
        });

        if (existing && existing.status === 'completed') {
            return existing.id;
        }

        // Create job record
        const jobId = uuidv4();
        const outputDir = path.join(HLS_CACHE_DIR, jobId);
        await fs.ensureDir(outputDir);

        await db.insert(transcodeJobs).values({
            id: jobId,
            mediaItemId,
            status: 'pending',
            outputDir,
        });

        // Start FFmpeg process async
        this.runTranscode(jobId, item.path, outputDir).catch(console.error);

        return jobId;
    }

    private async runTranscode(jobId: string, inputPath: string, outputDir: string) {
        console.log(`Starting transcode job ${jobId} for ${inputPath}`);

        await db.update(transcodeJobs)
            .set({ status: 'processing' })
            .where(eq(transcodeJobs.id, jobId));

        return new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-hls_time 10', // 10s segments
                    '-hls_list_size 0', // Keep all segments in playlist
                    '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
                    '-f hls'
                ])
                .output(path.join(outputDir, 'master.m3u8'))
                .on('end', async () => {
                    console.log(`Transcode job ${jobId} completed`);
                    await db.update(transcodeJobs)
                        .set({ status: 'completed', progress: 100, masterPlaylist: 'master.m3u8' })
                        .where(eq(transcodeJobs.id, jobId));
                    resolve();
                })
                .on('error', async (err) => {
                    console.error(`Transcode job ${jobId} failed:`, err);
                    await db.update(transcodeJobs)
                        .set({ status: 'failed' })
                        .where(eq(transcodeJobs.id, jobId));
                    reject(err);
                })
                .on('progress', async (progress) => {
                    // Throttled DB updates could be added here
                })
                .run();
        });
    }
}

export const transcodeManager = new TranscodeManager();
