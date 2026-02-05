import stringSimilarity from 'string-similarity';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { Prisma } from '@prisma/client';
import { ScrapedCaseInput } from '../types/case.types';

interface DuplicateMatch {
  existingCase: any;
  similarityScore: number;
  isDuplicate: boolean;
  shouldFlag: boolean;
}

class DeduplicationService {
  private readonly FUZZY_THRESHOLD = parseFloat(process.env.FUZZY_MATCH_THRESHOLD || '0.85');
  private readonly AUTO_REJECT_THRESHOLD = parseFloat(process.env.AUTO_REJECT_THRESHOLD || '0.95');

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async checkDuplicate(newCase: ScrapedCaseInput): Promise<DuplicateMatch | null> {
    try {
      // Step 1: Check exact URL match
      const urlMatch = await prisma.case.findUnique({
        where: { sourceUrl: newCase.sourceUrl },
      });

      if (urlMatch) {
        logger.info(`Exact URL match found for: ${newCase.sourceUrl}`);
        return {
          existingCase: urlMatch,
          similarityScore: 1.0,
          isDuplicate: true,
          shouldFlag: false,
        };
      }

      // Step 2: ONLY flag potential duplicates based on title similarity
      // Do NOT automatically reject unless URL matches exactly
      // Different settlements can have similar titles but different URLs
      const brandMatches = await prisma.case.findMany({
        where: {
          brand: {
            equals: newCase.brand,
            mode: 'insensitive',
          },
          status: {
            notIn: ['rejected', 'duplicate'],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const normalizedNewTitle = this.normalizeText(newCase.caseTitle);
      
      // Step 3: Check title similarity for each brand match
      for (const existingCase of brandMatches) {
        const normalizedExistingTitle = this.normalizeText(existingCase.caseTitle);
        const similarity = stringSimilarity.compareTwoStrings(
          normalizedNewTitle,
          normalizedExistingTitle
        );

        logger.debug(`Comparing "${newCase.caseTitle}" with "${existingCase.caseTitle}": ${similarity}`);

        // High similarity - flag for manual review (but don't auto-reject)
        // Only URL match should cause automatic rejection
        if (similarity >= this.FUZZY_THRESHOLD) {
          logger.info(`Potential duplicate found (${similarity}): ${newCase.caseTitle} vs ${existingCase.caseTitle}`);
          return {
            existingCase,
            similarityScore: similarity,
            isDuplicate: false, // Changed: don't mark as duplicate, just flag
            shouldFlag: true,
          };
        }
      }

      // Step 4: Check for very similar brands (fuzzy search)
      const similarBrandMatches = await prisma.case.findMany({
        where: {
          brand: {
            contains: newCase.brand.substring(0, Math.max(5, Math.floor(newCase.brand.length * 0.6))),
            mode: 'insensitive',
          },
          status: {
            notIn: ['rejected', 'duplicate'],
          },
        },
        take: 10,
      });

      for (const existingCase of similarBrandMatches) {
        // Skip if we already checked this one
        if (brandMatches.some((b: any) => b.id === existingCase.id)) continue;

        const normalizedExistingTitle = this.normalizeText(existingCase.caseTitle);
        const titleSimilarity = stringSimilarity.compareTwoStrings(
          normalizedNewTitle,
          normalizedExistingTitle
        );

        if (titleSimilarity >= this.FUZZY_THRESHOLD) {
          logger.info(`Cross-brand potential duplicate found: ${newCase.brand} vs ${existingCase.brand}`);
          return {
            existingCase,
            similarityScore: titleSimilarity,
            isDuplicate: false,
            shouldFlag: true,
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Error checking for duplicates:', error);
      throw error;
    }
  }

  async addOrUpdateCase(
    newCase: ScrapedCaseInput
  ): Promise<{ id: number; status: string; action: string }> {
    const duplicateCheck = await this.checkDuplicate(newCase);

    if (duplicateCheck?.isDuplicate) {
      logger.info(`Skipping duplicate case: ${newCase.caseTitle}`);
      return {
        id: duplicateCheck.existingCase.id,
        status: 'duplicate',
        action: 'skipped',
      };
    }

    // Insert new case
    const status = duplicateCheck?.shouldFlag ? 'flagged' : 'new';
    
    const createdCase = await prisma.case.create({
      data: {
        brand: newCase.brand,
        caseTitle: newCase.caseTitle,
        source: newCase.source,
        sourceUrl: newCase.sourceUrl,
        deadline: newCase.deadline,
        description: newCase.description,
        status,
        duplicateOfId: duplicateCheck?.existingCase?.id,
        similarityScore: duplicateCheck?.similarityScore 
          ? new Prisma.Decimal(duplicateCheck.similarityScore)
          : null,
      },
    });

    const action = duplicateCheck?.shouldFlag ? 'flagged' : 'added';
    
    logger.info(`Case ${action}: ${newCase.caseTitle} (ID: ${createdCase.id})`);
    
    return {
      id: createdCase.id,
      status,
      action,
    };
  }
}

export const deduplicationService = new DeduplicationService();
