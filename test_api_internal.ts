import axios from 'axios';

async function main() {

    let token;
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `admin_${randomSuffix} `;
    const password = 'password123';

    try {
        console.log(`Attempting Register as ${username}...`);
        const regRes = await axios.post('http://localhost:3001/api/v1/auth/register', {
            username,
            password
        });
        token = regRes.data.token;
        console.log('Registration successful.');
    } catch (regErr: any) {
        console.log('Registration failed, trying login...');
        const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', {
            username,
            password
        });
        token = loginRes.data.token;
    }

    try {
        // 2. Get Libraries
        console.log('\n--- Libraries ---');
        const libsRes = await axios.get('http://localhost:3001/api/v1/libraries', {
            headers: { Authorization: `Bearer ${token} ` }
        });
        console.table(libsRes.data);

        // 3. Get Items
        console.log('\n--- items ---');
        const itemsRes = await axios.get('http://localhost:3001/api/v1/library/items?limit=5', {
            headers: { Authorization: `Bearer ${token} ` }
        });
        if (itemsRes.data.length > 0) {
            console.log('First Item:', itemsRes.data[0]);
        } else {
            console.log('No items returned from API');
        }

    } catch (e: any) {
        console.error('API Error:', e.response?.data || e.message);
    }
}

main();
