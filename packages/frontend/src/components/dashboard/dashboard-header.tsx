import React from 'react';
import { Button } from '@/elements';
import { PlusIcon } from 'lucide-react';

interface DashboardHeaderProps {
  onNewClaim: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onNewClaim }) => {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Claims Intake Overview</h1>
        <p className="mt-1 text-gray-600">Review and process incoming legal and consumer claims.</p>
      </div>
      <Button onClick={onNewClaim} className="flex items-center gap-2 font-semibold text-sm py-2.5">
        <PlusIcon size={16} />
        New Manual Claim
      </Button>
    </div>
  );
};
