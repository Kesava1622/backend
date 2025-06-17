require('dotenv').config(); // ← MUST be at the very top
const mysql = require('mysql2/promise');
const createConnection = require('./db');
const conn = await createConnection();

// Debug: Log the environment variables being used
console.log('DB Connection Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: !!process.env.DB_CA_CERT // Shows if SSL is enabled
});

const connConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 30000,
  ssl: process.env.DB_SSL === 'true' ? { 
    rejectUnauthorized: false,
    ca: process.env.DB_CA_CERT?.replace(/\\n/g, '\n') // Fixes newline formatting
  } : false
};

// Using createConnection instead of createPool
const createDatabaseConnection = async () => {
  try {
    const connection = await mysql.createConnection(connConfig);
    await connection.query('SELECT 1');
    console.log('✅ Connection verified');
    return connection;
  } catch (err) {
    console.log('Actual ENV values:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      pass: process.env.DB_PASSWORD ? '*****' : 'MISSING',
      db: process.env.DB_NAME
    });
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
};

// Export a function that creates a new connection when called
module.exports = createDatabaseConnection;
conn.end();