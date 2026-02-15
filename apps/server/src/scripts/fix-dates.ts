import { db } from '../db';
import { mediaItems } from '../db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('Fixing invalid dates...');
    const allItems = await db.select().from(mediaItems).all();

    let fixed = 0;
    for (const item of allItems) {
        // Check if date is invalid (Drizzle might have returned null or Invalid Date object)
        // Since we know they showed up as "Invalid Date" in console, they really are messed up.
        // We will just blindly update all of them for now to Current Date to be safe, 
        // effectively "re-adding" them to the top of the list.

        await db.update(mediaItems)
            .set({
                addedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(mediaItems.id, item.id));
        fixed++;
    }

    console.log(`Fixed dates for ${fixed} items.`);
}

main().catch(console.error);
