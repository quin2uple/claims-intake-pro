import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { StatsResponse, ScrapeHistoryDTO } from '../types/stats.types';

class StatsService {
  async getStats(): Promise<StatsResponse> {
    // Total new cases
    const totalNew = await prisma.case.count({
      where: { status: 'new' },
    });

    // Pending duplicates (flagged)
    const pendingDuplicates = await prisma.case.count({
      where: { status: 'flagged' },
    });

    // Approved cases
    const totalApproved = await prisma.case.count({
      where: { status: 'approved' },
    });

    // Cases by status
    const statusBreakdown = await prisma.case.groupBy({
      by: ['status'],
      _count: true,
      orderBy: {
        _count: {
          status: 'desc',
        },
      },
    });

    // Cases by source (excluding rejected and duplicate)
    const sourceBreakdown = await prisma.case.groupBy({
      by: ['source'],
      where: {
        status: {
          notIn: ['rejected', 'duplicate'],
        },
      },
      _count: true,
      orderBy: {
        _count: {
          source: 'desc',
        },
      },
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM cases
      WHERE created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Average processing time (time from creation to approval/rejection in hours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const processingTimeResult = await prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))/3600) as avg_hours
      FROM cases
      WHERE reviewed_at IS NOT NULL
      AND created_at >= ${thirtyDaysAgo}
    `;

    // Resolution rate
    const resolutionResult = await prisma.$queryRaw<Array<{ resolution_rate: number | null }>>`
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')) * 100.0 / NULLIF(COUNT(*), 0) as resolution_rate
      FROM cases
      WHERE created_at >= ${thirtyDaysAgo}
    `;

    // Latest scrape history
    const scrapeHistory = await prisma.scrapeHistory.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    return {
      overview: {
        totalNew,
        pendingDuplicates,
        totalApproved,
        processingTime: processingTimeResult[0]?.avg_hours 
          ? processingTimeResult[0].avg_hours.toFixed(1)
          : null,
        resolutionRate: resolutionResult[0]?.resolution_rate 
          ? resolutionResult[0].resolution_rate.toFixed(0)
          : '0',
      },
      breakdown: {
        byStatus: statusBreakdown.map((item: any) => ({
          status: item.status,
          count: item._count.toString(),
        })),
        bySource: sourceBreakdown.map((item: any) => ({
          source: item.source,
          count: item._count.toString(),
        })),
      },
      recentActivity: recentActivity.map((item: any) => ({
        date: item.date.toISOString().split('T')[0],
        count: item.count.toString(),
      })),
      scrapeHistory: scrapeHistory.map(sh => this.transformScrapeHistory(sh)),
    };
  }

  async getScrapeHistory(limit: number = 20): Promise<ScrapeHistoryDTO[]> {
    const scrapes = await prisma.scrapeHistory.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return scrapes.map(sh => this.transformScrapeHistory(sh));
  }

  private transformScrapeHistory(sh: any): ScrapeHistoryDTO {
    return {
      id: sh.id,
      source: sh.source,
      started_at: sh.startedAt,
      completed_at: sh.completedAt,
      status: sh.status,
      cases_found: sh.casesFound,
      cases_added: sh.casesAdded,
      cases_skipped: sh.casesSkipped,
      error_message: sh.errorMessage,
      created_at: sh.createdAt,
    };
  }
}

export const statsService = new StatsService();
