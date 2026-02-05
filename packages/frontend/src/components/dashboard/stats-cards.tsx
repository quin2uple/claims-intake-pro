import React from 'react';
import { Card } from '@/elements';

interface StatsCardsProps {
  totalNew: number;
  processingTime: string;
  pendingDuplicates: number;
  resolutionRate: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  totalNew,
  processingTime,
  pendingDuplicates,
  resolutionRate,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total New */}
      <Card className="p-6">
        <div className="flex flex-col items-start justify-between">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Total New</p>
          <div className="flex justify-between w-full items-end">
            <p className="mt-2 text-4xl font-bold text-gray-900">{totalNew}</p>
            <span className="inline-flex items-center py-0.5 rounded-full text-sm font-medium text-green-700">
              +5%
            </span>
          </div>
        </div>
      </Card>

      {/* Processing Time */}
      <Card className="p-6">
        <div className="flex flex-col items-start justify-between">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
            Processing Time
          </p>

          <div className="flex justify-between w-full items-end">
            <p className="mt-2 text-4xl font-bold text-gray-900">{processingTime}</p>

            <span className="text-sm text-gray-400 font-semibold">Avg</span>
          </div>
        </div>
      </Card>

      {/* Pending Duplicates */}
      <Card className="p-6">
        <div className="flex flex-col items-start justify-between">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
            Pending Duplicates
          </p>

          <div className="flex justify-between w-full items-end">
            <div>
              <p className="mt-2 text-4xl font-bold text-yellow-500">{pendingDuplicates}</p>
            </div>

            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-600 text-xs">
              Action Req.
            </span>
          </div>
        </div>
      </Card>

      {/* Resolution Rate */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="w-full">
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Resolution Rate
            </p>
            <div className="flex justify-between">
              <p className="mt-2 text-4xl font-bold text-gray-900">{resolutionRate}%</p>
              <div className="mt-3 bg-gray-200 rounded-full h-2 w-18">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
