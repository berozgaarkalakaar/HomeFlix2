import axios from 'axios';

async function main() {
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `admin_home_${randomSuffix}`;
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

    console.log('Fetching Home...');
    const homeRes = await axios.get('http://localhost:3001/api/v1/home', {
        headers: { Authorization: `Bearer ${token}` }
    });

    // Inspect Hubs
    homeRes.data.forEach((hub: any) => {
        console.log(`\nHub: ${hub.title} (${hub.id})`);
        console.log(`Items: ${hub.items ? hub.items.length : 0}`);
        if (hub.items && hub.items.length > 0) {
            hub.items.forEach((i: any) => {
                console.log(` - ${i.title} (${i.id}) [Type: ${i.type}]`);
            });
        }
    });
}

main().catch(e => console.error(e));
