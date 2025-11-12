const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize database - Prisma will handle schema via migrations
const init = async () => {
  try {
    // Test connection
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Prisma migrations will handle schema creation
    // Run: npx prisma migrate dev or npx prisma db push
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = {
  prisma,
  init,
};
