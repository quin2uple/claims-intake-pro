import { Case, CaseStatus, SourceType, ActivityLog } from '@prisma/client';

export interface GetCasesQuery {
  status?: string;
  source?: string;
  brand?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CaseWithRelations extends Case {
  duplicateOf?: {
    id: number;
    brand: string;
    caseTitle: string;
  } | null;
}

export interface CaseWithActivity extends CaseWithRelations {
  activityLogs: ActivityLog[];
}

export interface UpdateCaseStatusData {
  status: CaseStatus;
  notes?: string;
  userName?: string;
  duplicateOf?: number;
}

export interface CreateCaseData {
  brand: string;
  caseTitle: string;
  sourceUrl: string;
  deadline?: string;
  description?: string;
  userName?: string;
}

export interface PaginatedCasesResponse {
  cases: CaseWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ScrapedCaseInput {
  brand: string;
  caseTitle: string;
  source: SourceType;
  sourceUrl: string;
  deadline?: Date;
  description?: string;
}

export interface CaseResponseDTO {
  id: number;
  brand: string;
  case_title: string;
  source: string;
  source_url: string;
  deadline: Date | null;
  description: string | null;
  status: string;
  duplicate_of: number | null;
  similarity_score: any;
  created_at: Date;
  updated_at: Date;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  duplicate_brand?: string;
  duplicate_case_title?: string;
}

export interface ActivityLogResponseDTO {
  id: number;
  case_id: number;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  user_name: string | null;
  notes: string | null;
  created_at: Date;
}
