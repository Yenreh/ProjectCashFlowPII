import { Pool } from 'pg'

async function checkAccounts() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const result = await pool.query('SELECT id, name FROM accounts ORDER BY name')
    console.log('Cuentas en la base de datos:')
    console.log(JSON.stringify(result.rows, null, 2))
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkAccounts()
