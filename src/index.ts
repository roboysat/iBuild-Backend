import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRouter from './auth';
import userRouter from './users';
import projectRouter from './projects';
import workerRouter from './workers';
import documentRouter from './documents';
import uploadRouter from './uploads';
import estimateRouter from './estimate';
import adminRouter from './admin';
import syncRouter from './sync';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(helmet());
app.use(express.json());

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/projects', projectRouter);
app.use('/api/v1/workers', workerRouter);
app.use('/api/v1/documents', documentRouter);
app.use('/api/v1/uploads', uploadRouter);
app.use('/api/v1/estimate', estimateRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/sync', syncRouter);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 