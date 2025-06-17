require('dotenv').config(); // ← MUST be at the very top
const mysql = require('mysql2/promise');

// Debug: Log the environment variables being used
console.log('DB Connection Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: !!process.env.DB_CA_CERT // Shows if SSL is enabled
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 1000,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 30000,
  ssl: process.env.DB_SSL === 'true' ? { 
    rejectUnauthorized: true,
    ca: process.env.DB_CA_CERT?.replace(/\\n/g, '\n') // Fixes newline formatting
  } : false
});

pool.query('SELECT 1')
  .then(() => console.log('✅ Connection verified'))
  .catch(err => {
    console.log('Actual ENV values:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      pass: process.env.DB_PASSWORD ? '***********' : 'MISSING',
      db: process.env.DB_NAME
    });
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
module.exports = pool;