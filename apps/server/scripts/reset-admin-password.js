
const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('data/homeflix.db');

const TARGET_USER = 'admin';
const NEW_PASSWORD = 'admin123';

try {
    console.log(`Resetting password for user: ${TARGET_USER}...`);

    // Hashing Logic (must match src/core/auth.ts)
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(NEW_PASSWORD, salt, 1000, 64, 'sha512').toString('hex');

    const info = db.prepare('UPDATE users SET passwordHash = ?, salt = ? WHERE username = ?')
        .run(hash, salt, TARGET_USER);

    if (info.changes > 0) {
        console.log(`Success! Password for '${TARGET_USER}' set to '${NEW_PASSWORD}'`);
    } else {
        console.log(`User '${TARGET_USER}' not found.`);
    }

} catch (err) {
    console.error('Error resetting password:', err.message);
}
