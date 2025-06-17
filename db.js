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
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 30000,
  ssl: process.env.DB_SSL === 'false' ? { 
    rejectUnauthorized: true,
    ca: process.env.DB_CA_CERT?.replace(/\\n/g, '\n') // Fixes newline formatting
  } : false
});

// Enhanced connection test
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL Connection Successful');
    return conn.query('SELECT NOW() AS current_time')
      .then(([rows]) => {
        console.log('Database Time:', rows[0].current_time);
        conn.release();
      });
  })
  .catch(err => {
    console.error('❌ FATAL DB CONNECTION ERROR:', {
      message: err.message,
      code: err.code,
      fatal: true
    });
    process.exit(1);
  });

module.exports = pool;