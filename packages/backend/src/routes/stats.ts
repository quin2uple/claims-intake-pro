import express, { Router } from 'express';
import { statsController } from '../controllers/stats.controller';

const router: Router = express.Router();

router.get('/', statsController.getStats.bind(statsController));
router.get('/scrapes', statsController.getScrapeHistory.bind(statsController));

export default router;
