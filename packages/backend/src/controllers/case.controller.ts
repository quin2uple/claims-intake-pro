import { Request, Response } from 'express';
import { caseService } from '../services/case.service';
import { CaseTransformer } from '../utils/transformers';
import { logger } from '../utils/logger';
import { CaseStatus } from '@prisma/client';

class CaseController {
	async getAllCases(req: Request, res: Response) {
		try {
			const {
				status,
				source,
				brand,
				page = '1',
				limit = '10',
				sortBy = 'createdAt',
				sortOrder = 'desc',
			} = req.query;

			const result = await caseService.getCases({
				status: status as string,
				source: source as string,
				brand: brand as string,
				page: parseInt(page as string),
				limit: parseInt(limit as string),
				sortBy: sortBy as string,
				sortOrder: sortOrder as 'asc' | 'desc',
			});

			const transformedCases = result.cases.map(c => CaseTransformer.toResponseDTO(c));

			res.json({
				cases: transformedCases,
				pagination: result.pagination,
			});
		} catch (error) {
			logger.error('Error fetching cases:', error);
			res.status(500).json({ error: 'Failed to fetch cases' });
		}
	}

	async getCaseById(req: Request, res: Response) {
		try {
			const { id } = req.params;

			const caseData = await caseService.getCaseById(parseInt(id));

			const transformedCase = CaseTransformer.toResponseDTO(caseData);
			const transformedActivity = caseData.activityLogs.map(log =>
				CaseTransformer.toActivityLogDTO(log)
			);

			res.json({
				case: transformedCase,
				activity: transformedActivity,
			});
		} catch (error: any) {
			if (error.message === 'Case not found') {
				return res.status(404).json({ error: 'Case not found' });
			}
			logger.error('Error fetching case:', error);
			res.status(500).json({ error: 'Failed to fetch case' });
		}
	}

	async updateCaseStatus(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const { status, notes, userName, duplicateOf } = req.body;

			const validStatuses: CaseStatus[] = ['new', 'pending', 'flagged', 'approved', 'rejected', 'duplicate'];
			if (!validStatuses.includes(status as CaseStatus)) {
				return res.status(400).json({ error: 'Invalid status' });
			}

			const result = await caseService.updateStatus(parseInt(id), {
				status: status as CaseStatus,
				notes,
				userName,
				duplicateOf,
			});

			const transformedCase = CaseTransformer.toResponseDTO(result);

			res.json({ case: transformedCase });
		} catch (error: any) {
			if (error.message === 'Case not found') {
				return res.status(404).json({ error: 'Case not found' });
			}
			logger.error('Error updating case:', error);
			res.status(500).json({ error: 'Failed to update case' });
		}
	}

	async createCase(req: Request, res: Response) {
		try {
			const { brand, caseTitle, sourceUrl, deadline, description, userName } = req.body;

			if (!brand || !caseTitle || !sourceUrl) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			const result = await caseService.create({
				brand,
				caseTitle,
				sourceUrl,
				deadline,
				description,
				userName,
			});

			const transformedCase = CaseTransformer.toResponseDTO(result);

			res.status(201).json({ case: transformedCase });
		} catch (error: any) {
			logger.error('Error creating case:', error);

			if (error.code === 'P2002') {
				return res.status(409).json({ error: 'Case with this URL already exists' });
			}

			res.status(500).json({ error: 'Failed to create case' });
		}
	}

	async deleteCase(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const { userName } = req.body;

			const result = await caseService.delete(parseInt(id), userName);

			const transformedCase = CaseTransformer.toResponseDTO(result);

			res.json({ message: 'Case deleted', case: transformedCase });
		} catch (error: any) {
			if (error.code === 'P2025') {
				return res.status(404).json({ error: 'Case not found' });
			}
			logger.error('Error deleting case:', error);
			res.status(500).json({ error: 'Failed to delete case' });
		}
	}
}

export const caseController = new CaseController();
