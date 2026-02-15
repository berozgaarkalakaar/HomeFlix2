import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { mediaItems, libraries } from '../db/schema';
import { eq } from 'drizzle-orm';
import { scanner } from '../core/scanner';

// Base directories
const UPLOAD_DIR = path.join(process.cwd(), 'media', 'uploads', 'incoming');
const MEDIA_ROOT = path.join(process.cwd(), 'media');

// Helper to sanitize filenames
const sanitize = (name: string) => name.replace(/[^a-z0-9\.\-\_]/gi, '_');

export const handleUploadCommit = async (req: any, res: Response) => {
    try {
        const { uploadId, category, metadata, originalFilename } = req.body;
        const userId = req.user.userId;

        if (!uploadId || !category || !originalFilename) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const sourcePath = path.join(UPLOAD_DIR, uploadId);

        // Check if file exists (tus stores it as just the ID typically, or ID.bin depending on config.
        // With @tus/file-store, the file is named after the ID in the directory.
        // HACK: Sometimes it has .bin or metadata json. Let's check.
        // The robust way is to use the TusServer events, but for this "Commit" patterns, 
        // we assume the client says "I'm done".

        if (!fs.existsSync(sourcePath)) {
            return res.status(404).json({ error: 'Upload not found or expired' });
        }

        // Determine destination
        let destRelativePath = '';
        let destFileName = sanitize(originalFilename);

        // Metadata extraction
        const title = metadata.title ? sanitize(metadata.title) : 'Unknown';
        const year = metadata.year ? ` (${metadata.year})` : '';

        if (category === 'movies') {
            // Structure: movies/Title (Year)/Title (Year).ext
            const folderName = `${title}${year}`;
            destRelativePath = path.join('movies', folderName);
            // Rename file to match folder? Optional. Let's keep original name for simplicity or rename to title.
            // Let's keep original name to avoid extension guessing issues if not provided.

        } else if (category === 'tv') {
            // Structure: tv/ShowName/Season X/Episode.ext
            const show = metadata.show ? sanitize(metadata.show) : 'Unknown Show';
            const season = metadata.season ? `Season ${metadata.season}` : 'Season 01';
            destRelativePath = path.join('tv', show, season);

        } else if (category === 'music') {
            // Structure: music/Artist/Album/Track.ext
            const artist = metadata.artist ? sanitize(metadata.artist) : 'Unknown Artist';
            const album = metadata.album ? sanitize(metadata.album) : 'Unknown Album';
            destRelativePath = path.join('music', artist, album);

        } else if (category === 'photos') {
            // Structure: photos/Year-Month/Image.ext
            const date = new Date();
            const folder = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            destRelativePath = path.join('photos', folder);
        } else {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const destDir = path.join(MEDIA_ROOT, destRelativePath);
        const destPath = path.join(destDir, destFileName);

        // Ensure dir exists
        await fs.ensureDir(destDir);

        // Move file
        await fs.move(sourcePath, destPath, { overwrite: true });

        // Clean up tus metadata file if exists (id.json or id.info)
        // @tus/file-store usually triggers this on finish, but we are manually handling the "commit".
        // Actually, if we use the proper Tus hooks, we don't need this manual commit endpoint for moving,
        // but the user requirement effectively asks for a manual "Commit" step with metadata.
        // This is safer because we can validate metadata before moving.

        const infoPath = sourcePath + '.info';
        if (fs.existsSync(infoPath)) await fs.remove(infoPath);

        // Scan specifically this file?
        // Our scanner currently scans by Library ID.
        // We need to find which library this file belongs to.
        // HACK: For MVP, we'll just trigger a scan of the library that matches the category.
        // We need to look up library by path or type.
        // Ideally we pass libraryId from client, but category is easier for UX.

        // Let's scan the file directly if the scanner supports it or just valid library.
        // We'll expose a public `scanFile(path)` on scanner or just re-scan the library.
        // Let's do a quick lookup of library by type.

        // Explicitly trigger a scan for this file
        // Map category to library type
        let libType = 'movie';
        if (category === 'tv') libType = 'show'; // In schema it is 'show'? Or 'series'?
        // The libraries table schema comment says: 'movie', 'show', 'music', 'photo'
        // Let's verify schema again if needed, but assuming 'show' based on previous comments.
        // Wait, line 17 of schema.ts: type: text('type').notNull(), // 'movie', 'show', 'music', 'photo'
        // So 'show' is correct.
        else if (category === 'music') libType = 'music';
        else if (category === 'photos') libType = 'photo';

        const library = await db.query.libraries.findFirst({
            where: eq(libraries.type, libType)
        });

        if (library) {
            console.log(`Triggering immediate scan for new upload: ${destPath}`);
            // Fire and forget (optional) or await.
            // Awaiting ensures user sees it immediately after this request returns.
            // Since scanFile is fast (one file), we await.
            await scanner.scanFile(destPath, library.id);
        } else {
            console.warn(`No library found for type ${libType}, skipping scan.`);
        }

    } catch (err: any) {
        console.error('Upload commit failed:', err);
        res.status(500).json({ error: err.message });
    }
};
