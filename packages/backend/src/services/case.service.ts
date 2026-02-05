import { prisma } from '../database/client';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import {
	GetCasesQuery,
	UpdateCaseStatusData,
	CreateCaseData,
	PaginatedCasesResponse,
	CaseWithActivity,
} from '../types/case.types';

class CaseService {
	async getCases(query: GetCasesQuery): Promise<PaginatedCasesResponse> {
		const {
			status,
			source,
			brand,
			page = 1,
			limit = 10,
			sortBy = 'createdAt',
			sortOrder = 'desc',
		} = query;

		const skip = (page - 1) * limit;

		// Build where clause
		const where: Prisma.CaseWhereInput = {};

		if (status) {
			where.status = status as any;
		}

		if (source) {
			where.source = source as any;
		}

		if (brand) {
			where.brand = {
				contains: brand,
				mode: 'insensitive',
			};
		}

		// Get total count
		const total = await prisma.case.count({ where });

		// Build order by
		const validSortColumns = ['createdAt', 'brand', 'deadline', 'status'];
		const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
		const orderBy: Record<string, 'asc' | 'desc'> = { [sortColumn]: sortOrder };

		// Get cases
		const cases = await prisma.case.findMany({
			where,
			include: {
				duplicateOf: {
					select: {
						id: true,
						brand: true,
						caseTitle: true,
					},
				},
			},
			orderBy,
			skip,
			take: limit,
		});

		return {
			cases,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async getCaseById(id: number): Promise<CaseWithActivity> {
		const caseData = await prisma.case.findUnique({
			where: { id },
			include: {
				duplicateOf: {
					select: {
						id: true,
						brand: true,
						caseTitle: true,
					},
				},
				activityLogs: {
					orderBy: { createdAt: 'desc' },
				},
			},
		});

		if (!caseData) {
			throw new Error('Case not found');
		}

		return caseData;
	}

	async updateStatus(id: number, data: UpdateCaseStatusData) {
		const { status, notes, userName, duplicateOf } = data;

		// Get current case
		const currentCase = await prisma.case.findUnique({
			where: { id },
		});

		if (!currentCase) {
			throw new Error('Case not found');
		}

		const previousStatus = currentCase.status;

		// Update case and create activity log in a transaction
		const result = await prisma.$transaction(async (tx: any) => {
			const updatedCase = await tx.case.update({
				where: { id },
				data: {
					status,
					reviewedAt: new Date(),
					reviewedBy: userName || 'Unknown',
					duplicateOfId: duplicateOf || null,
				},
				include: {
					duplicateOf: {
						select: {
							id: true,
							brand: true,
							caseTitle: true,
						},
					},
				},
			});

			await tx.activityLog.create({
				data: {
					caseId: id,
					action: 'status_change',
					previousStatus,
					newStatus: status,
					userName: userName || 'Unknown',
					notes: notes || null,
				},
			});

			return updatedCase;
		});

		logger.info(`Case ${id} status updated: ${previousStatus} -> ${status} by ${userName}`);

		return result;
	}

	async create(data: CreateCaseData) {
		const { brand, caseTitle, sourceUrl, deadline, description, userName } = data;

		const result = await prisma.$transaction(async (tx: any) => {
			const newCase = await tx.case.create({
				data: {
					brand,
					caseTitle,
					source: 'Manual',
					sourceUrl,
					deadline: deadline ? new Date(deadline) : null,
					description,
					status: 'new',
				},
			});

			await tx.activityLog.create({
				data: {
					caseId: newCase.id,
					action: 'manual_create',
					newStatus: 'new',
					userName: userName || 'Unknown',
				},
			});

			return newCase;
		});

		logger.info(`Manual case created: ${caseTitle} by ${userName}`);

		return result;
	}

	async delete(id: number, userName?: string) {
		const result = await prisma.$transaction(async (tx: any) => {
			const updatedCase = await tx.case.update({
				where: { id },
				data: {
					status: 'rejected',
					reviewedAt: new Date(),
					reviewedBy: userName || 'Unknown',
				},
			});

			await tx.activityLog.create({
				data: {
					caseId: id,
					action: 'delete',
					newStatus: 'rejected',
					userName: userName || 'Unknown',
				},
			});

			return updatedCase;
		});

		return result;
	}
}

export const caseService = new CaseService();
