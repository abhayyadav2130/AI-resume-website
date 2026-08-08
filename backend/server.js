import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const httpServer = createServer(app);
const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:5173"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many requests. Please try again later.' } }));
app.use(express.static(frontendDirectory));
app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }), authRoutes);
app.use('/resume', resumeRoutes);
app.use('/user', userRoutes);
app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDatabase();
  try {
    const { Server } = await import('socket.io');
    const io = new Server(httpServer, { cors: { origin: env.clientUrl.split(',').map((url) => url.trim()), methods: ['GET', 'POST'] } });
    io.use((socket, next) => {
      try { socket.userId = jwt.verify(socket.handshake.auth?.token, env.jwtSecret).sub; next(); } catch { next(new Error('Unauthorized socket')); }
    });
    io.on('connection', (socket) => socket.join(`user:${socket.userId}`));
    app.set('io', io);
    console.log('Live resume updates enabled');
  } catch { console.warn('Socket.io is not installed; live updates are disabled until npm.cmd install completes.'); }
  httpServer.listen(env.port, () => console.log(`API listening on port ${env.port}`));
}
start().catch((error) => { console.error('Unable to start API:', error.message); process.exit(1); });
