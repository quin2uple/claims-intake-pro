import { ScrapeHistory } from '@prisma/client';

export interface StatsOverview {
  totalNew: number;
  pendingDuplicates: number;
  totalApproved: number;
  processingTime: string | null;
  resolutionRate: string;
}

export interface StatusBreakdown {
  status: string;
  count: string;
}

export interface SourceBreakdown {
  source: string;
  count: string;
}

export interface RecentActivity {
  date: string;
  count: string;
}

export interface ScrapeHistoryDTO {
  id: number;
  source: string;
  started_at: Date;
  completed_at: Date | null;
  status: string;
  cases_found: number;
  cases_added: number;
  cases_skipped: number;
  error_message: string | null;
  created_at: Date;
}

export interface StatsResponse {
  overview: StatsOverview;
  breakdown: {
    byStatus: StatusBreakdown[];
    bySource: SourceBreakdown[];
  };
  recentActivity: RecentActivity[];
  scrapeHistory: ScrapeHistoryDTO[];
}
