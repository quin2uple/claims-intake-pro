import React from 'react';
import { Input, Select } from '@/elements';

interface FilterBarProps {
  searchBrand: string;
  source: string;
  status: string;
  deadline: string;
  onSearchChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchBrand,
  source,
  status,
  deadline,
  onSearchChange,
  onSourceChange,
  onStatusChange,
  onDeadlineChange,
}) => {
  const sourceOptions = [
    { value: '', label: 'All Sources' },
    { value: 'ClaimDepot', label: 'ClaimDepot' },
    { value: 'ClassActionOrg', label: 'ClassAction.org' },
    { value: 'TopClassActions', label: 'TopClassActions' },
    { value: 'Manual', label: 'Manual' },
  ];

  const statusOptions = [
    { value: '', label: 'New Intake' },
    { value: 'new', label: 'New' },
    { value: 'flagged', label: 'Flagged' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const deadlineOptions = [
    { value: '', label: 'All Deadlines' },
    { value: '7', label: 'Next 7 Days' },
    { value: '30', label: 'Next 30 Days' },
    { value: '90', label: 'Next 90 Days' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SEARCH BRAND</label>
          <Input
            type="text"
            placeholder="Search by brand name..."
            value={searchBrand}
            onChange={(e) => onSearchChange(e.target.value)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SOURCE</label>
          <Select
            options={sourceOptions}
            value={source}
            onValueChange={onSourceChange}
            placeholder="All Sources"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">STATUS</label>
          <Select
            options={statusOptions}
            value={status}
            onValueChange={onStatusChange}
            placeholder="New Intake"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">DEADLINE</label>
          <Select
            options={deadlineOptions}
            value={deadline}
            onValueChange={onDeadlineChange}
            placeholder="Next 7 Days"
          />
        </div>
      </div>
    </div>
  );
};
