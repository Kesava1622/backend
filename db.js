const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'srv1675.hstgr.io', // or your Hostinger MySQL host
  user: 'u466412800_deepamcrackers',
  password: 'Kesava@1622',
  database: 'u466412800_crackers',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log('Successfully connected to the database');
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// Call the test function when the application starts
testConnection();


module.exports = db;
