const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'srv1675.hstgr.io', // or your Hostinger MySQL host
  user: 'u466412800_deepamcrackers',
  password: 'Kesava@1622',
  database: 'u466412800_crackers',
});

module.exports = db;
