import axios from 'axios';
import fs from 'fs';

async function main() {
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `admin_stream_${randomSuffix}`;
    const password = 'password123';

    // Login/Register
    let token;
    try {
        const regRes = await axios.post('http://localhost:3001/api/v1/auth/register', { username, password });
        token = regRes.data.token;
    } catch (e) {
        const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', { username, password });
        token = loginRes.data.token;
    }

    // Get Items
    const itemsRes = await axios.get('http://localhost:3001/api/v1/library/items?limit=10', {
        headers: { Authorization: `Bearer ${token}` }
    });

    // Find the MKV item
    const mkvItem = itemsRes.data.find((i: any) => i.path.endsWith('.mkv'));
    if (!mkvItem) {
        console.log('No MKV item found to test transcoding.');
        return;
    }

    console.log(`Testing Stream for: ${mkvItem.id} (${mkvItem.title})`);

    try {
        const response = await axios.get(`http://localhost:3001/api/v1/stream/${mkvItem.id}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'stream'
        });

        console.log('Status:', response.status);
        console.log('Headers:', response.headers);

        const dest = fs.createWriteStream('./test_stream_output.mp4');
        response.data.pipe(dest);

        // Wait a bit and kill
        setTimeout(() => {
            console.log('Creating 5s of stream...');
            response.data.destroy(); // Abort
            dest.close();
            console.log('Stream test aborted (success check headers).');
        }, 5000);

    } catch (err: any) {
        console.error('Stream Error:', err.response?.status, err.message);
    }
}

main();
