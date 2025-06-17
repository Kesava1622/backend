const mysql = require('mysql2/promise');

// Connection pool with ENV variables
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  ssl: process.env.DB_CA_CERT ? { 
    rejectUnauthorized: true,
    ca: process.env.DB_CA_CERT 
  } : false
});

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL database');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1); // Fail fast if no DB connection
  });

module.exports = pool;