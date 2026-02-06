import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader, FilterBar, CasesTable, StatsCards } from '@/components/dashboard';
import { getCaseDetailRoute } from '@/constants';
import { useCases, useStats, useDeleteCase, useUpdateCaseStatus } from '@/hooks';

const ITEMS_PER_PAGE = 10;

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Filters
  const [searchBrand, setSearchBrand] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [deadline, setDeadline] = useState('');

  // Pagination (0-indexed for TanStack Table)
  const [currentPage, setCurrentPage] = useState(0);

  // React Query hooks (API is 1-indexed, but TanStack Table is 0-indexed)
  const { data: casesData, isLoading: casesLoading } = useCases({
    brand: searchBrand || undefined,
    source: source || undefined,
    status: status || undefined,
    deadlineDays: deadline ? parseInt(deadline) : undefined,
    page: currentPage + 1, // Convert to 1-indexed for API
    limit: ITEMS_PER_PAGE,
  });

  const { data: statsData } = useStats();
  const deleteCaseMutation = useDeleteCase();
  const updateCaseStatusMutation = useUpdateCaseStatus();

  const cases = casesData?.cases || [];
  const pagination = casesData?.pagination
    ? {
        pageIndex: currentPage,
        pageSize: ITEMS_PER_PAGE,
        totalItems: casesData.pagination.total,
        totalPages: casesData.pagination.totalPages,
      }
    : undefined;

  const handleViewCase = (id: number) => {
    navigate(getCaseDetailRoute(id));
  };

  const handleApproveCase = async (id: number) => {
    try {
      await updateCaseStatusMutation.mutateAsync({ id, status: 'approved' });
    } catch (error) {
      console.error('Error approving case:', error);
      alert('Failed to approve case');
    }
  };

  const handleRejectCase = async (id: number) => {
    try {
      await updateCaseStatusMutation.mutateAsync({ id, status: 'rejected' });
    } catch (error) {
      console.error('Error rejecting case:', error);
      alert('Failed to reject case');
    }
  };

  const handleDeleteCase = async (id: number) => {
    try {
      await deleteCaseMutation.mutateAsync({ id });
    } catch (error) {
      console.error('Error deleting case:', error);
      alert('Failed to delete case');
    }
  };

  const handleResolveCase = async (id: number) => {
    try {
      await updateCaseStatusMutation.mutateAsync({ id, status: 'new' });
    } catch (error) {
      console.error('Error resolving case:', error);
      alert('Failed to resolve case');
    }
  };

  const handleNewClaim = () => {
    // TODO: Open modal for new manual claim
    alert('New manual claim modal - To be implemented');
  };

  return (
    <div>
      <DashboardHeader onNewClaim={handleNewClaim} />

      <FilterBar
        searchBrand={searchBrand}
        source={source}
        status={status}
        deadline={deadline}
        onSearchChange={setSearchBrand}
        onSourceChange={setSource}
        onStatusChange={setStatus}
        onDeadlineChange={setDeadline}
      />

      <CasesTable
        cases={cases}
        pagination={pagination}
        onPaginationChange={setCurrentPage}
        onViewCase={handleViewCase}
        onApproveCase={handleApproveCase}
        onRejectCase={handleRejectCase}
        onDeleteCase={handleDeleteCase}
        onResolveCase={handleResolveCase}
        isLoading={casesLoading}
      />

      <div className="mt-8">
        <StatsCards
          totalNew={statsData?.overview?.totalNew || 0}
          processingTime={statsData?.overview?.processingTime || '0h'}
          pendingDuplicates={statsData?.overview?.pendingDuplicates || 0}
          resolutionRate={parseFloat(statsData?.overview?.resolutionRate || '0')}
        />
      </div>
    </div>
  );
};
