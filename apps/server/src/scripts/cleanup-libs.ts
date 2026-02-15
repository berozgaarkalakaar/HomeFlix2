import { db } from '../db';
import { libraries, mediaItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

async function main() {
    console.log('Checking for invalid libraries...');
    const allLibs = await db.select().from(libraries).all();

    for (const lib of allLibs) {
        let isValid = false;
        try {
            if (fs.existsSync(lib.path) && fs.statSync(lib.path).isDirectory()) {
                isValid = true;
            }
        } catch (e) {
            isValid = false;
        }

        if (!isValid) {
            console.log(`Removing invalid library: ${lib.name} (${lib.path})`);
            await db.delete(libraries).where(eq(libraries.id, lib.id));
            await db.delete(mediaItems).where(eq(mediaItems.libraryId, lib.id));
        } else {
            console.log(`Valid library: ${lib.name}`);
        }
    }
    console.log('Cleanup complete.');
}

main().catch(console.error);
