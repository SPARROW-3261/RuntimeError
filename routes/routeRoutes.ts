import { Router } from 'express';
import { getRoutes } from '../controllers/routeController';

const router = Router();

// Handle both / and empty path relative to mount point
router.post(['/', ''], getRoutes);

export default router;
