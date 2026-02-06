import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  pagination?: {
    pageIndex: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  onPaginationChange?: (pageIndex: number) => void;
  isLoading?: boolean;
}

export function DataTable<TData>({
  columns,
  data,
  pagination,
  onPaginationChange,
  isLoading,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages ?? -1,
  });

  const renderPaginationButtons = () => {
    if (!pagination) return null;

    const { pageIndex, totalPages } = pagination;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (pageIndex < 3) {
        pages.push(0, 1, 2, 3, '...', totalPages - 1);
      } else if (pageIndex > totalPages - 4) {
        pages.push(0, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
      } else {
        pages.push(0, '...', pageIndex - 1, pageIndex, pageIndex + 1, '...', totalPages - 1);
      }
    }

    return pages.map((page, idx) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">
            ...
          </span>
        );
      }

      const pageNumber = page as number;
      const isActive = pageNumber === pageIndex;

      return (
        <button
          key={pageNumber}
          onClick={() => onPaginationChange?.(pageNumber)}
          className={cn(
            'min-w-9 min-h-9 px-3 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          )}
        >
          {pageNumber + 1}
        </button>
      );
    });
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden rounded-b-none">
        <div className="overflow-x-auto">
          <div className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <div key={headerGroup.id} className="flex">
                {headerGroup.headers.map((header) => {
                  const size = header.column.columnDef.size;
                  const isFlexColumn = size === undefined;

                  return (
                    <div
                      key={header.id}
                      style={
                        isFlexColumn
                          ? undefined
                          : {
                            width: size,
                            minWidth: size,
                            maxWidth: size,
                          }
                      }
                      className={twMerge('px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider', isFlexColumn ? 'flex-1' : '')}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              </div>
            ) : data.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">No data available</div>
            ) : (
              table.getRowModel().rows.map((row) => (
                <div key={row.id} className="flex hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map((cell) => {
                    const size = cell.column.columnDef.size;
                    const isFlexColumn = size === undefined;

                    return (
                      <div
                        key={cell.id}
                        style={
                          isFlexColumn
                            ? undefined
                            : {
                              width: size,
                              minWidth: size,
                              maxWidth: size,
                            }
                        }
                        className={isFlexColumn ? 'flex-1' : ''}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {pagination && pagination.totalItems > 0 && (
        <div className="flex items-center justify-between p-6 border border-t-0 rounded-b-2xl">
          <div className="text-sm text-gray-700">
            Showing{' '}
            <span className="font-semibold">{pagination.pageIndex * pagination.pageSize + 1}</span> to{' '}
            <span className="font-semibold">
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.totalItems)}
            </span>{' '}
            of <span className="font-semibold">{pagination.totalItems}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPaginationChange?.(pagination.pageIndex - 1)}
              disabled={pagination.pageIndex === 0}
              className={cn(
                'h-10 w-10 rounded-lg border border-gray-300 flex items-center justify-center transition-colors',
                pagination.pageIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              <ChevronLeft />
            </button>

            {renderPaginationButtons()}

            <button
              onClick={() => onPaginationChange?.(pagination.pageIndex + 1)}
              disabled={pagination.pageIndex >= pagination.totalPages - 1}
              className={cn(
                'h-10 w-10 rounded-lg border border-gray-300 flex items-center justify-center transition-colors',
                pagination.pageIndex >= pagination.totalPages - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
