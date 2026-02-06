import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '@/lib';
import type { CasesResponse } from '@/types';

export const useCases = (params?: {
  status?: string;
  source?: string;
  brand?: string;
  deadlineDays?: number;
  page?: number;
  limit?: number;
}) => {
  return useQuery<CasesResponse>({
    queryKey: ['cases', params],
    queryFn: () => casesApi.getAll(params),
  });
};

export const useCaseById = (id: number) => {
  return useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.getById(id),
    enabled: !!id,
  });
};

export const useUpdateCaseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
      userName,
      duplicateOf,
    }: {
      id: number;
      status: string;
      notes?: string;
      userName?: string;
      duplicateOf?: number;
    }) => casesApi.updateStatus(id, { status, notes, userName, duplicateOf }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

export const useCreateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      brand: string;
      caseTitle: string;
      sourceUrl: string;
      deadline?: string;
      description?: string;
      userName?: string;
    }) => casesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

export const useDeleteCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userName }: { id: number; userName?: string }) =>
      casesApi.delete(id, userName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};
