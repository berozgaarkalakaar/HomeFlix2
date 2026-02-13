
const Database = require('better-sqlite3');
const db = new Database('data/homeflix.db');

try {
    const users = db.prepare('SELECT username, isAdmin FROM users').all();
    console.log('Registered Users:');
    users.forEach(u => {
        console.log(`- ${u.username} (Admin: ${u.isAdmin})`);
    });
    if (users.length === 0) {
        console.log('No users found.');
    }
} catch (err) {
    console.error('Error reading users:', err.message);
}
