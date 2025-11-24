#!/usr/bin/env tsx

/**
 * Test de conexión a base de datos
 * Ejecutar con: npx tsx tests/test-connection.ts
 * 
 * IMPORTANTE: Este test es de SOLO LECTURA, no modifica datos
 */

import { neon } from '@neondatabase/serverless'

async function testConnection() {
  const DATABASE_URL = process.env.DATABASE_URL
  
  if (!DATABASE_URL) {
    console.log('[SKIP] No DATABASE_URL environment variable found')
    console.log('       The application will run in mock data mode')
    return
  }

  console.log('[TEST] Testing database connection...')
  console.log(`       URL: ${DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`)

  try {
    const sql = neon(DATABASE_URL)
    
    // Test 1: Basic connection
    const result = await sql`SELECT NOW() as timestamp, 'Hello from database!' as message`
    console.log('[PASS] Database connection successful')
    console.log(`       Server time: ${result[0].timestamp}`)
    console.log(`       Message: ${result[0].message}`)

    // Test 2: Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('usuarios', 'categories', 'accounts', 'transactions')
      ORDER BY table_name
    `

    if (tables.length === 0) {
      console.log('[WARN] No application tables found')
      console.log('       Run: psql $DATABASE_URL -f scripts/00-setup-database-complete.sql')
      process.exit(0) // No es error, solo advertencia
    } else {
      console.log('[PASS] Found tables:', tables.map((t: any) => t.table_name).join(', '))
      
      // Test 3: Count records (READ ONLY)
      const userCount = await sql`SELECT COUNT(*) as count FROM usuarios`
      const categoryCount = await sql`SELECT COUNT(*) as count FROM categories`
      const accountCount = await sql`SELECT COUNT(*) as count FROM accounts`
      const transactionCount = await sql`SELECT COUNT(*) as count FROM transactions`
      
      console.log(`       Users: ${userCount[0].count}`)
      console.log(`       Categories: ${categoryCount[0].count}`)
      console.log(`       Accounts: ${accountCount[0].count}`)
      console.log(`       Transactions: ${transactionCount[0].count}`)
    }

    console.log('\n[PASS] All connection tests passed')
    process.exit(0)

  } catch (error: any) {
    console.log('[FAIL] Database connection failed:', error.message)
    console.log('       The application will fall back to mock data')
    process.exit(1)
  }
}

testConnection().catch(console.error)
