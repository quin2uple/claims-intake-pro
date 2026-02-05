import { Request, Response } from 'express';
import { statsService } from '../services/stats.service';
import { logger } from '../utils/logger';

class StatsController {
  async getStats(req: Request, res: Response) {
    try {
      const stats = await statsService.getStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  async getScrapeHistory(req: Request, res: Response) {
    try {
      const { limit = '20' } = req.query;
      const scrapes = await statsService.getScrapeHistory(parseInt(limit as string));
      
      res.json({ scrapes });
    } catch (error) {
      logger.error('Error fetching scrape history:', error);
      res.status(500).json({ error: 'Failed to fetch scrape history' });
    }
  }
}

export const statsController = new StatsController();
