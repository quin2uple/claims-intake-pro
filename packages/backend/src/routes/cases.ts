import express, { Router } from 'express';
import { caseController } from '../controllers/case.controller';

const router: Router = express.Router();

router.get('/', caseController.getAllCases.bind(caseController));
router.get('/:id', caseController.getCaseById.bind(caseController));
router.patch('/:id/status', caseController.updateCaseStatus.bind(caseController));
router.post('/', caseController.createCase.bind(caseController));
router.delete('/:id', caseController.deleteCase.bind(caseController));

export default router;
