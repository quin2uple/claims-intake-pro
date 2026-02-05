import { CaseResponseDTO, ActivityLogResponseDTO, CaseWithRelations } from '../types/case.types';

export class CaseTransformer {
	static toResponseDTO(caseData: CaseWithRelations): CaseResponseDTO {
		return {
			id: caseData.id,
			brand: caseData.brand,
			case_title: caseData.caseTitle,
			source: caseData.source,
			source_url: caseData.sourceUrl,
			deadline: caseData.deadline,
			description: caseData.description,
			status: caseData.status,
			duplicate_of: caseData.duplicateOfId,
			similarity_score: caseData.similarityScore,
			created_at: caseData.createdAt,
			updated_at: caseData.updatedAt,
			reviewed_at: caseData.reviewedAt,
			reviewed_by: caseData.reviewedBy,
			duplicate_brand: caseData.duplicateOf?.brand,
			duplicate_case_title: caseData.duplicateOf?.caseTitle,
		};
	}

	static toActivityLogDTO(log: any): ActivityLogResponseDTO {
		return {
			id: log.id,
			case_id: log.caseId,
			action: log.action,
			previous_status: log.previousStatus,
			new_status: log.newStatus,
			user_name: log.userName,
			notes: log.notes,
			created_at: log.createdAt,
		};
	}
}
