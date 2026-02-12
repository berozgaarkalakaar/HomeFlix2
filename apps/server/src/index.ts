import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

import apiRoutes from './api/routes';

app.use(cors());
app.use(express.json());

app.use('/api/v1', apiRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
