import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Badge } from '@/elements';
import { appRoutes } from '@/constants';
import { api } from '@/lib';

interface CaseDetail {
  id: number;
  brand: string;
  caseTitle: string;
  source: string;
  sourceUrl: string;
  deadline: string | null;
  status: string;
  description?: string;
  duplicateOfId?: number | null;
  similarityScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const response = await api.get(`/api/cases/${id}`);
        setCaseDetail(response.data);
      } catch (error) {
        console.error('Error fetching case:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCase();
    }
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/api/cases/${id}`, { status: newStatus });
      setCaseDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Case not found</p>
        <Button onClick={() => navigate(appRoutes.dashboard)} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(appRoutes.dashboard)}
          className="flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody className="space-y-6">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {caseDetail.caseTitle}
                    </h1>
                    <p className="text-sm text-gray-500">
                      ID: #CLM-{caseDetail.id.toString().padStart(5, '0')}
                    </p>
                  </div>
                  <Badge variant={caseDetail.status === 'flagged' ? 'flagged' : 'new'}>
                    {caseDetail.status}
                  </Badge>
                </div>
              </div>

              {caseDetail.duplicateOfId && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-orange-600 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-orange-900">Potential Duplicate</p>
                      <p className="text-sm text-orange-700 mt-1">
                        This case appears to be a duplicate of case #CLM-
                        {caseDetail.duplicateOfId.toString().padStart(5, '0')}
                        {caseDetail.similarityScore &&
                          ` (${(caseDetail.similarityScore * 100).toFixed(0)}% similarity)`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {caseDetail.description || 'No description available.'}
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Source URL</h2>
                <a
                  href={caseDetail.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {caseDetail.sourceUrl}
                </a>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Brand</dt>
                  <dd className="mt-1 text-sm text-gray-900">{caseDetail.brand}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Source</dt>
                  <dd className="mt-1 text-sm text-gray-900">{caseDetail.source}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Deadline</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {caseDetail.deadline
                      ? new Date(caseDetail.deadline).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(caseDetail.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(caseDetail.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleStatusChange('approved')}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleStatusChange('pending')}
                >
                  Mark as Pending
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => handleStatusChange('rejected')}
                >
                  Reject
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
