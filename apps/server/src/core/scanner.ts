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

        if (library.path.startsWith('remote://')) {
            await this.scanRemoteLibrary(library.path, libraryId, library.type);
        } else {
            await this.scanDirectory(library.path, libraryId, library.type);
        }
    }

    private async scanRemoteLibrary(remoteUrl: string, libraryId: string, type: string) {
        try {
            // Parse remote://IP:PORT/PATH
            // Example: remote://192.168.1.50:3100/D:/Movies
            const urlObj = new URL(remoteUrl.replace('remote://', 'http://'));
            const remoteHost = `${urlObj.protocol}//${urlObj.host}`;
            const remotePath = decodeURIComponent(urlObj.pathname.substring(1)); // Remove leading /

            console.log(`[Scanner] Fetching remote list from ${remoteHost} for path: ${remotePath}`);

            // Fetch list from Satellite
            console.log(`[Scanner] POST ${remoteHost}/list with folderPath: ${remotePath}`);
            const response = await fetch(`${remoteHost}/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer homeflix-satellite' },
                body: JSON.stringify({ folderPath: remotePath })
            });

            console.log(`[Scanner] Remote response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                console.error(`[Scanner] Failed to fetch remote list: ${response.statusText}`);
                const text = await response.text();
                console.error(`[Scanner] Response body: ${text}`);
                return;
            }

            const entries: any[] = await response.json();
            console.log(`[Scanner] Received ${entries.length} entries from remote.`);

            for (const entry of entries) {
                // entry: { name, isDirectory, path, size }
                if (entry.isDirectory) {
                    console.log(`[Scanner] Recursing into remote dir: ${entry.path}`);
                    const subRemoteUrl = `remote://${urlObj.host}/${encodeURIComponent(entry.path)}`;
                    await this.scanRemoteLibrary(subRemoteUrl, libraryId, type);
                } else {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (VIDEO_EXTENSIONS.includes(ext)) {
                        const streamUrl = `${remoteHost}/stream?path=${encodeURIComponent(entry.path)}&token=homeflix-satellite`;
                        console.log(`[Scanner] Found video: ${entry.name}. Scanning stream: ${streamUrl}`);
                        await this.scanFile(streamUrl, libraryId, type);
                    } else {
                        // console.log(`[Scanner] Skipping non-video: ${entry.name}`);
                    }
                }
            }

        } catch (err) {
            console.error(`[Scanner] Error scanning remote library ${remoteUrl}:`, err);
        }
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

        let title = path.basename(filePath, path.extname(filePath));

        // Adjust title extraction for Remote URLs
        if (filePath.startsWith('http')) {
            try {
                const url = new URL(filePath);
                const queryPath = url.searchParams.get('path');
                if (queryPath) {
                    const remoteFilename = path.basename(queryPath);
                    title = path.basename(remoteFilename, path.extname(remoteFilename));
                }
            } catch (e) {
                // Fallback to basic basename
            }
        }

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
                    // width/height not in schema, relying on resolution
                    chapters: meta.chapters || [], // Drizzle handles stringify for mode: 'json'
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
