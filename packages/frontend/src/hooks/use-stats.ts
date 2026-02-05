import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib';
import type { Stats } from '@/types';

export const useStats = () => {
  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => statsApi.get(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useScrapeHistory = (limit?: number) => {
  return useQuery({
    queryKey: ['scrapeHistory', limit],
    queryFn: () => statsApi.getScrapeHistory(limit),
  });
};
