const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const SECRET_KEY = 'your_secret_key_here_change_this_to_env_var';

// MySQL pool setup
const db = mysql.createPool({
  host: 'srv1675.hstgr.io',
  user: 'u466412800_deepamcrackers',
  password: 'Kesava@1622',
  database: 'u466412800_crackers',
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'deepamcrackerssvks@gmail.com',
    pass: 'kmvp zous iowz nibw'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Calculate subtotal
function calculateSubtotal(cartItems) {
  return cartItems.reduce((total, item) => {
    const price = parseFloat(item.price ?? item.discountedPrice) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return total + price * quantity;
  }, 0).toFixed(2);
}

// Calculate shipping (fixed)
function calculateShipping() {
  return 300.00;
}

// Calculate total (subtotal + shipping)
function calculateTotal(cartItems) {
  const subtotal = parseFloat(calculateSubtotal(cartItems));
  const shipping = calculateShipping();
  return (subtotal + shipping).toFixed(2);
}

// JWT Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ message: 'Token required' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Login route: simple mock user validation & JWT generation
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // TODO: Replace this mock check with real DB user validation
  if (username === 'admin' && password === 'password123') {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    return res.json({ token });
  }

  res.status(401).json({ message: 'Invalid credentials' });
});

// Protected route: get products by category (requires JWT)
app.get('/api/products/:category', authenticateToken, async (req, res) => {
  const { category } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE category = ?', [category]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  const { category, title, imageUrl, originalPrice, discountedPrice, discountPercent, quantity } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO products (category, title, imageUrl, originalPrice, discountedPrice, discountPercent, quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category, title, imageUrl, originalPrice, discountedPrice, discountPercent, quantity]
    );
    res.json({ message: 'Product added', productId: result.insertId });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ message: 'Error adding product', error: err.message });
  }
});

// Test DB connection route (no auth needed)
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ success: true, result: rows[0].result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send user order email route (no auth)
app.post('/send-email', (req, res) => {
  const { username, email, mobile, state, city, addressLine1, addressLine2, cartItems, pincode, ordernumber } = req.body;

  const cartItemsHtml = cartItems.map(item => `
    <tr>
      <td>${item.name || item.title || 'Unnamed Item'}</td>
      <td>${item.quantity || 0}</td>
      <td>${item.price ?? item.discountedPrice ?? 0}</td>
      <td>${((item.quantity || 0) * (item.price ?? item.discountedPrice ?? 0)).toFixed(2)}</td>
    </tr>`).join('');

  fs.readFile(path.join(__dirname, 'email_template.html'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading email template:', err);
      return res.status(500).json({ message: 'Error reading email template', error: err.message });
    }

    const htmlContent = data
      .replaceAll('{{username}}', username)
      .replaceAll('{{cartItems}}', cartItemsHtml)
      .replaceAll('{{orderSubtotal}}', calculateSubtotal(cartItems))
      .replaceAll('{{orderShipping}}', calculateShipping())
      .replaceAll('{{addressLine1}}', addressLine1)
      .replaceAll('{{addressLine2}}', addressLine2)
      .replaceAll('{{state}}', state)
      .replaceAll('{{city}}', city)
      .replaceAll('{{mobile}}', mobile)
      .replaceAll('{{email}}', email)
      .replaceAll('{{pincode}}', pincode)
      .replaceAll('{{ordernumber}}', ordernumber)
      .replaceAll('{{orderTotal}}', calculateTotal(cartItems));

    const mailOptions = {
      from: 'deepamcrackerssvks@gmail.com',
      to: email,
      subject: 'Your Deepam Crackers order has been received',
      html: htmlContent,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, 'assets/logo.png'),
          cid: 'logo'
        }
      ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending email', error: error.message });
      }
      console.log('Email sent: ' + info.response);
      res.status(200).json({ message: 'Email sent', response: info.response });
    });
  });
});

// Send admin notification email (no auth)
app.post('/send-admin-email', (req, res) => {
  const { username, email, mobile, state, city, addressLine1, addressLine2, cartItems, pincode, ordernumber } = req.body;

  const cartItemsHtml = cartItems.map(item => `
    <tr>
      <td>${item.name || item.title || 'Unnamed Item'}</td>
      <td>${item.quantity || 0}</td>
      <td>${item.price ?? item.discountedPrice ?? 0}</td>
      <td>${((item.quantity || 0) * (item.price ?? item.discountedPrice ?? 0)).toFixed(2)}</td>
    </tr>`).join('');

  fs.readFile(path.join(__dirname, 'admin_email_template.html'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading admin email template:', err);
      return res.status(500).json({ message: 'Error reading admin email template', error: err.message });
    }

    const htmlContent = data
      .replaceAll('{{username}}', username)
      .replaceAll('{{cartItems}}', cartItemsHtml)
      .replaceAll('{{orderSubtotal}}', calculateSubtotal(cartItems))
      .replaceAll('{{orderShipping}}', calculateShipping())
      .replaceAll('{{addressLine1}}', addressLine1)
      .replaceAll('{{addressLine2}}', addressLine2)
      .replaceAll('{{state}}', state)
      .replaceAll('{{city}}', city)
      .replaceAll('{{mobile}}', mobile)
      .replaceAll('{{email}}', email)
      .replaceAll('{{pincode}}', pincode)
      .replaceAll('{{ordernumber}}', ordernumber)
      .replaceAll('{{orderTotal}}', calculateTotal(cartItems));

    const mailOptions = {
      from: 'deepamcrackerssvks@gmail.com',
      to: 'deepamcrackerssvks@gmail.com', // admin email
      subject: 'New Order Received - Deepam Crackers',
      html: htmlContent,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, 'assets/logo.png'),
          cid: 'logo'
        }
      ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending admin email:', error);
        return res.status(500).json({ message: 'Error sending admin email', error: error.message });
      }
      console.log('Admin email sent: ' + info.response);
      res.status(200).json({ message: 'Admin email sent', response: info.response });
    });
  });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
