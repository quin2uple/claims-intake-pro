import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge, IconButton } from '@/elements';
import { DataTable } from '@/elements/data-table';
import type { Case } from '@/types';
import { twMerge } from 'tailwind-merge';
import { Times, Warning } from '../common';
import { Check, Trash2 } from 'lucide-react';

interface CasesTableProps {
  cases: Case[];
  pagination?: {
    pageIndex: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  onPaginationChange?: (pageIndex: number) => void;
  onViewCase: (id: number) => void;
  onApproveCase: (id: number) => void;
  onRejectCase: (id: number) => void;
  onDeleteCase: (id: number) => void;
  onResolveCase: (id: number) => void;
  isLoading?: boolean;
}

const getBrandInitials = (brand: string) => {
  return brand
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getStatusBadgeVariant = (status: string): 'new' | 'flagged' | 'pending' | 'success' | 'warning' | 'danger' => {
  switch (status.toLowerCase()) {
    case 'new':
      return 'new';
    case 'flagged':
      return 'flagged';
    case 'pending':
      return 'pending';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'new';
  }
};

const formatDeadline = (deadline: string | null | undefined) => {
  if (!deadline) return 'N/A';
  const date = new Date(deadline);
  if (isNaN(date.getTime())) return 'N/A';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return <span className="text-red-600 font-semibold">Today (Urgent)</span>;
  } else if (diffDays < 0) {
    return <span className="text-gray-500">Expired</span>;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const CasesTable: React.FC<CasesTableProps> = ({
  cases,
  pagination,
  onPaginationChange,
  onViewCase,
  onApproveCase,
  onRejectCase,
  onDeleteCase,
  onResolveCase,
  isLoading,
}) => {
  const columns = useMemo<ColumnDef<Case>[]>(
    () => [
      {
        accessorKey: 'brand',
        header: 'Brand',
        size: 240,
        cell: ({ row }) => (
          <div
            className={twMerge(
              'flex items-center px-6 py-4 relative h-full',
              row.original.duplicate_of && 'bg-yellow-50'
            )}
          >
            {row.original.duplicate_of && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
            )}
            <div className="flex-shrink-0 h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-500">
                {getBrandInitials(row.original.brand)}
              </span>
            </div>
            <div className="ml-4">
              <div className="text-sm font-semibold text-gray-900">{row.original.brand}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'case_title',
        header: 'Case Title',
        size: undefined,
        cell: ({ row }) => (
          <div
            className={twMerge('px-6 py-4 max-w-md h-full flex flex-col justify-center', row.original.duplicate_of && 'bg-yellow-50')}
          >
            <div className="text-sm text-gray-900">
              <div style={{ display: 'ruby' }}>
                <a
                  href={row.original.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {row.original.case_title}
                </a>
                {row.original.duplicate_of && <span className="text-yellow-500"><Warning /></span>}
              </div>
              {row.original.duplicate_of && (
                <div className="flex items-center gap-1 mt-1 text-xs text-yellow-600">
                  Flagged: Duplicate of #CLM-{row.original.duplicate_of}
                </div>
              )}
            </div>
            {!row.original.duplicate_of && <div className="text-xs text-gray-500 mt-1">ID: #CLM-{row.original.id.toString()}</div>}
          </div>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        size: 160,
        cell: ({ row }) => (
          <div
            className={twMerge(
              'px-6 py-4 text-sm text-gray-900 whitespace-nowrap flex items-center h-full',
              row.original.duplicate_of && 'bg-yellow-50'
            )}
          >
            <div className="bg-slate-100 px-2 py-1 rounded-md text-xs">
              {row.original.source}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'deadline',
        header: 'Deadline',
        size: 140,
        cell: ({ row }) => (
          <div
            className={twMerge(
              'px-6 py-4 text-sm text-gray-900 whitespace-nowrap flex items-center h-full',
              row.original.duplicate_of && 'bg-yellow-50'
            )}
          >
            {formatDeadline(row.original.deadline)}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 140,
        cell: ({ row }) => (
          <div
            className={twMerge(
              'px-6 py-4 whitespace-nowrap flex items-center h-full',
              row.original.duplicate_of && 'bg-yellow-50'
            )}
          >
            <Badge variant={getStatusBadgeVariant(row.original.status)}>
              {row.original.status.toUpperCase()}
            </Badge>
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        size: 220,
        cell: ({ row }) => (
          <div
            className={twMerge(
              'flex items-center justify-end gap-5 px-6 py-4 h-full',
              row.original.duplicate_of && 'bg-yellow-50'
            )}
          >
            {row.original.status !== 'flagged' && (
              <IconButton
                icon={<Check size={14} />}
                onClick={() => onApproveCase(row.original.id)}
                title="Approve"
                variant="primary"
                className="rounded-full"
                size='sm'
              />
            )}

            {row.original.status !== 'flagged' && (
              <IconButton
                icon={<span className="text-white"><Times /></span>}
                onClick={() => onRejectCase(row.original.id)}
                title="Reject"
                variant="secondary"
                size="sm"
                className="rounded-full bg-gray-400"
              />
            )}

            {row.original.status === 'flagged' && (
              <IconButton
                icon={<Trash2 size={18} />}
                onClick={() => {
                  if (window.confirm('Are you sure you want to permanently delete this case?')) {
                    onDeleteCase(row.original.id);
                  }
                }}
                title="Delete"
                variant="ghost"
                size="sm"
              />
            )}

            {row.original.status === 'flagged' && (
              <button
                onClick={() => onResolveCase(row.original.id)}
                className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Resolve
              </button>
            )}
          </div>
        ),
      },
    ],
    [onViewCase, onApproveCase, onRejectCase, onDeleteCase, onResolveCase]
  );

  return (
    <DataTable
      columns={columns}
      data={cases}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      isLoading={isLoading}
    />
  );
};
