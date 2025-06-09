/**
 * Calculates the subtotal of the items in the shopping cart.
 * @param {Object[]} cartItems - An array of cart items, where each item has properties `name`, `price`, and `quantity`.
 * @returns {string} The subtotal of the cart items, formatted as a string with two decimal places.
 */
function calculateSubtotal(cartItems) {
  return cartItems.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return total + price * quantity;
  }, 0).toFixed(2);
}


/**
 * Calculates the shipping cost for the order.
 * @returns {number} The shipping cost, which is a fixed amount of 300.00.
 */
function calculateShipping() {
  return 300.00;
}

/**
 * Calculates the total cost of the order, including the subtotal and shipping.
 * @param {Object[]} cartItems - An array of cart items, where each item has properties `name`, `price`, and `quantity`.
 * @returns {string} The total cost of the order, formatted as a string with two decimal places.
 */
function calculateTotal(cartItems) {
  const subtotal = parseFloat(calculateSubtotal(cartItems)) || 0;
  const shipping = calculateShipping();
  return (subtotal + shipping).toFixed(2);
}

const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');


const app = express();
app.use(bodyParser.json());
app.use(cors());

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
function calculateSubtotal(cartItems) {
  return cartItems.reduce((total, item) => {
    const price = parseFloat(item.price ?? item.discountedPrice) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return total + price * quantity;
  }, 0).toFixed(2);
}


function calculateShipping() {
  return 300.00;
}

function calculateTotal(cartItems) {
  const subtotal = calculateSubtotal(cartItems);
  const shipping = calculateShipping();
  return (parseFloat(subtotal) + shipping).toFixed(2);
}

const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'srv1675.hstgr.io',    // e.g., 'srv123.main-hosting.eu'
  user: 'u466412800_deepamcrackers',                 // e.g., 'u123456789_user'
  password: 'Kesava@1622',
  database: 'u466412800_crackers',             // e.g., 'u123456789_crackers'
});


app.post('/send-email', (req, res) => {
  const { username, email, mobile, state, city, addressLine1, addressLine2, cartItems, pincode, ordernumber } = req.body;

  const cartItemsHtml = cartItems.map(item => `
  <tr>
  <td>${item.name || item.title || 'Unnamed Item'}</td>
  <td>${item.quantity || 0}</td>
  <td>${item.price ?? item.discountedPrice ?? 0}</td>
  <td>${((item.quantity || 0) * (item.price ?? item.discountedPrice ?? 0)).toFixed(2)}</td>
  
    </tr>
`).join('');

  fs.readFile(path.join(__dirname, 'email_template.html'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading email template:', err);
      res.status(500).json({ message: 'Error reading email template', error: err.message });
      return;
    }

    app.get('/api/products/:category', async (req, res) => {
      const { category } = req.params;
    
      try {
        const [rows] = await db.query('SELECT * FROM products WHERE category = ?', [category]);
        res.json(rows);
      } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Database error', error: err.message });
      }
    });
    app.post('/api/products', async (req, res) => {
      const { category, title, imageUrl, originalPrice, discountedPrice, discountPercent, quantity } = req.body;
    
      try {
        const [result] = await db.query(`
          INSERT INTO products (category, title, imageUrl, originalPrice, discountedPrice, discountPercent, quantity)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [category, title, imageUrl, originalPrice, discountedPrice, discountPercent, quantity]);
    
        res.json({ message: 'Product added', productId: result.insertId });
      } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ message: 'Error adding product', error: err.message });
      }
    });
    app.get('/api/test-db', async (req, res) => {
      try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({ success: true, result: rows[0].result });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
            

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
      .replaceAll('{{pincode}}',pincode)
      .replaceAll('{{ordernumber}}',ordernumber)
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
        res.status(500).json({ message: 'Error sending email', error: error.message });
      } else {
        console.log('Email sent: ' + info.response);
        res.status(200).json({ message: 'Email sent', response: info.response });
      }
    });
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.post('/send-admin-email', (req, res) => {
  const { username, email, mobile, state, city, addressLine1, addressLine2, cartItems, pincode, ordernumber} = req.body;

  const cartItemsHtml = cartItems.map(item => `
  <tr>
    <td>${item.name || item.title || 'Unnamed Item'}</td>
    <td>${item.quantity || 0}</td>
    <td>${item.price ?? item.discountedPrice ?? 0}</td>
    <td>${((item.quantity || 0) * (item.price ?? item.discountedPrice ?? 0)).toFixed(2)}</td>
  </tr>
`).join('');


  fs.readFile(path.join(__dirname, 'admin_email_template.html'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading admin email template:', err);
      res.status(500).json({ message: 'Error reading admin email template', error: err.message });
      return;
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
      to: 'deepamcrackerssvks@gmail.com', // Replace with actual admin email
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
        res.status(500).json({ message: 'Error sending admin email', error: error.message });
      } else {
        console.log('Admin email sent: ' + info.response);
        res.status(200).json({ message: 'Admin email sent', response: info.response });
      }
    });
  });
});

