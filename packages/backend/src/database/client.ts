import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prismaClientSingleton = () => {
	return new PrismaClient({
		log: process.env.NODE_ENV === 'development'
			? ['query', 'error', 'warn']
			: ['error'],
	});
};

declare global {
	var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export async function connectDatabase() {
	try {
		await prisma.$connect();
		logger.info('Database connected successfully');
	} catch (error) {
		logger.error('Failed to connect to database:', error);
		throw error;
	}
}

export async function disconnectDatabase() {
	await prisma.$disconnect();
	logger.info('Database disconnected');
}
