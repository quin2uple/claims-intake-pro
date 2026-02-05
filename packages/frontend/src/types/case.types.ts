export interface Case {
  id: number;
  brand: string;
  case_title: string;
  source: 'ClaimDepot' | 'ClassAction.org' | 'TopClassActions' | 'Manual';
  source_url: string;
  deadline?: string;
  description?: string;
  status: 'new' | 'pending' | 'flagged' | 'approved' | 'rejected' | 'duplicate';
  duplicate_of?: number;
  similarity_score?: number;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  duplicate_brand?: string;
  duplicate_case_title?: string;
}

export interface CasesResponse {
  cases: Case[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
