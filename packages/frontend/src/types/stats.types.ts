export interface Stats {
  overview: {
    totalNew: number;
    pendingDuplicates: number;
    totalApproved: number;
    processingTime: string | null;
    resolutionRate: string;
  };
  breakdown: {
    byStatus: Array<{ status: string; count: string }>;
    bySource: Array<{ source: string; count: string }>;
  };
  recentActivity: Array<{ date: string; count: string }>;
  scrapeHistory: Array<any>;
}
