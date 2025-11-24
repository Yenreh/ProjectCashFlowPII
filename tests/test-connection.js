#!/usr/bin/env node

/**
 * Simple script to test database connection
 * Usage: node scripts/test-connection.js
 */

const { neon } = require('@neondatabase/serverless');

async function testConnection() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.log('❌ No DATABASE_URL environment variable found');
    console.log('   The application will run in mock data mode');
    return;
  }

  console.log('🔍 Testing database connection...');
  console.log(`   URL: ${DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

  try {
    const sql = neon(DATABASE_URL);
    
    // Test basic connection
    const result = await sql`SELECT NOW() as timestamp, 'Hello from database!' as message`;
    console.log('✅ Database connection successful!');
    console.log(`   Server time: ${result[0].timestamp}`);
    console.log(`   Message: ${result[0].message}`);

    // Test if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('categories', 'accounts', 'transactions')
      ORDER BY table_name
    `;

    if (tables.length === 0) {
      console.log('⚠️  No application tables found');
      console.log('   Run: psql $DATABASE_URL -f scripts/01-create-tables.sql');
      console.log('   Run: psql $DATABASE_URL -f scripts/02-seed-categories.sql');
    } else {
      console.log('✅ Found tables:', tables.map(t => t.table_name).join(', '));
      
      // Test data
      const categoryCount = await sql`SELECT COUNT(*) as count FROM categories`;
      const accountCount = await sql`SELECT COUNT(*) as count FROM accounts`;
      const transactionCount = await sql`SELECT COUNT(*) as count FROM transactions`;
      
      console.log(`   Categories: ${categoryCount[0].count}`);
      console.log(`   Accounts: ${accountCount[0].count}`);
      console.log(`   Transactions: ${transactionCount[0].count}`);
    }

  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('   The application will fall back to mock data');
  }
}

testConnection().catch(console.error);