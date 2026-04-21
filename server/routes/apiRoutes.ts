import { Router } from 'express';
import { getRoutes, saveTrip, getHistory, deleteHistoryTrip } from '../controllers/routeController';

const router = Router();

router.post('/routes', getRoutes);
router.post('/history', saveTrip);
router.get('/history', getHistory);
router.delete('/history/:id', deleteHistoryTrip);
router.post('/history/delete', deleteHistoryTrip);

export default router;
