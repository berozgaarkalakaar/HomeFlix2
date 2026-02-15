import fs from 'fs-extra';
import path from 'path';
import { db } from '../db';
import { mediaItems, libraries, mediaStreams } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getMediaMetadata } from './metadata';
import { imageManager } from './image-manager';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];

export class LibraryScanner {
    async scanLibrary(libraryId: string) {
        const library = await db.query.libraries.findFirst({
            where: eq(libraries.id, libraryId),
        });

        if (!library) {
            console.error(`Library ${libraryId} not found`);
            return;
        }

        console.log(`Scanning library: ${library.name} (${library.path})`);
        await this.scanDirectory(library.path, libraryId, library.type);
    }

    private async scanDirectory(dirPath: string, libraryId: string, type: string) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    await this.scanDirectory(fullPath, libraryId, type);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (VIDEO_EXTENSIONS.includes(ext)) {
                        await this.scanFile(fullPath, libraryId, type);
                    }
                }
            }
        } catch (err) {
            console.error(`Error scanning directory ${dirPath}:`, err);
        }
    }



    public async scanFile(filePath: string, libraryId: string, type: string) {
        // Check if exists
        const existing = await db.query.mediaItems.findFirst({
            where: eq(mediaItems.path, filePath),
        });

        if (existing) {
            return; // Already indexed
        }

        console.log(`Processing: ${filePath}`);
        const title = path.basename(filePath, path.extname(filePath));

        try {
            const meta = await getMediaMetadata(filePath);
            const id = uuidv4();

            await db.transaction(async (tx) => {
                // Insert Media Item
                await tx.insert(mediaItems).values({
                    id,
                    libraryId,
                    type,
                    path: filePath,
                    title,
                    year: new Date().getFullYear(), // Placeholder - real parser needed later
                    duration: Math.floor(meta.duration),
                    codec: meta.video?.codec,
                    resolution: meta.video?.resolution,
                    bitrate: Math.floor(meta.bitrate),
                    audioChannels: meta.audio[0]?.channels,
                    width: meta.video?.width,
                    height: meta.video?.height,
                    chapters: JSON.stringify(meta.chapters || []),
                    addedAt: new Date(),
                    updatedAt: new Date(),
                });

                // Insert Audio Streams
                for (const audio of meta.audio) {
                    await tx.insert(mediaStreams).values({
                        id: uuidv4(),
                        mediaItemId: id,
                        index: audio.index,
                        type: 'audio',
                        codec: audio.codec,
                        language: audio.language,
                        label: audio.label,
                        isDefault: audio.isDefault
                    });
                }

                // Insert Subtitle Streams
                for (const sub of meta.subtitles) {
                    await tx.insert(mediaStreams).values({
                        id: uuidv4(),
                        mediaItemId: id,
                        index: sub.index,
                        type: 'subtitle',
                        codec: sub.codec,
                        language: sub.language,
                        label: sub.label,
                        isDefault: sub.isDefault
                    });
                }
            });

            // Generate Poster Async (don't block scan)
            imageManager.generatePoster(id, filePath, meta.duration).catch(console.error);

            console.log(`Indexed: ${title} [${meta.video?.resolution}, ${meta.duration}s]`);
        } catch (err) {
            console.error(`Failed to process ${filePath}:`, err);
        }
    }
}

export const scanner = new LibraryScanner();
