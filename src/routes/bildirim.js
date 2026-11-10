import { Router } from 'express';
import bildirimController from '../controllers/bildirimController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// SSE canlı akış ucu (Kimlik doğrulamalı)
router.get('/stream', authMiddleware, bildirimController.sseStream);

// Bildirim listesi ve okundu işaretleme
router.get('/', authMiddleware, bildirimController.getBildirimler);
router.post('/:id/okundu', authMiddleware, bildirimController.markRead);
router.post('/tumunu-oku', authMiddleware, bildirimController.markAllRead);

export default router;
