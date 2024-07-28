/**
 * Calculates the subtotal of the items in the shopping cart.
 * @param {Object[]} cartItems - An array of cart items, where each item has properties `name`, `price`, and `quantity`.
 * @returns {string} The subtotal of the cart items, formatted as a string with two decimal places.
 */
function calculateSubtotal(cartItems) {
  return cartItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
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
  const subtotal = calculateSubtotal(cartItems);
  const shipping = calculateShipping();
  return (parseFloat(subtotal) + shipping).toFixed(2);
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
    pass: 'dtur mlly tkcn lzby'
  },
  tls: {
    rejectUnauthorized: false
  }
});
function calculateSubtotal(cartItems) {
  return cartItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
}

function calculateShipping() {
  return 300.00;
}

function calculateTotal(cartItems) {
  const subtotal = calculateSubtotal(cartItems);
  const shipping = calculateShipping();
  return (parseFloat(subtotal) + shipping).toFixed(2);
}


app.post('/send-email', (req, res) => {
  const { username, email, mobile, state, city, addressLine1, addressLine2, cartItems, pincode, ordernumber } = req.body;

  const cartItemsHtml = cartItems.map(item => `
  <tr>
    <td>${item.name}</td>
    <td>${item.quantity}</td>
    <td>${item.price}</td>
    <td>${item.quantity * item.price}</td>
    </tr>
`).join('');

  fs.readFile(path.join(__dirname, 'email_template.html'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading email template:', err);
      res.status(500).json({ message: 'Error reading email template', error: err.message });
      return;
    }

    const htmlContent = data
      .replace('{{username}}', username)
      .replace('{{cartItems}}', cartItemsHtml)
      .replace('{{orderSubtotal}}', calculateSubtotal(cartItems))
      .replace('{{orderShipping}}', calculateShipping())
      .replace('{{addressLine1}}', addressLine1)
      .replace('{{addressLine2}}', addressLine2)
      .replace('{{state}}', state)
      .replace('{{city}}', city)
      .replace('{{mobile}}', mobile)
      .replace('{{email}}', email)
      .replace('{{pincode}}',pincode)
      .replace('{{ordernumber}}',ordernumber)
      .replace('{{orderTotal}}', calculateTotal(cartItems));


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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.post('/send-admin-email', (req, res) => {
  const { username, email, mobile, state, city, addressLine1, addressLine2, cartItems, pincode, ordernumber, pdfUrl } = req.body;

  const cartItemsHtml = cartItems.map(item => `
  <tr>
    <td>${item.name}</td>
    <td>${item.quantity}</td>
    <td>${item.price}</td>
    <td>${item.quantity * item.price}</td>
  </tr>
`).join('');

  fs.readFile(path.join(__dirname, 'admin_email_template.html'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading admin email template:', err);
      res.status(500).json({ message: 'Error reading admin email template', error: err.message });
      return;
    }

    const htmlContent = data
      .replace('{{username}}', username)
      .replace('{{cartItems}}', cartItemsHtml)
      .replace('{{orderSubtotal}}', calculateSubtotal(cartItems))
      .replace('{{orderShipping}}', calculateShipping())
      .replace('{{addressLine1}}', addressLine1)
      .replace('{{addressLine2}}', addressLine2)
      .replace('{{state}}', state)
      .replace('{{city}}', city)
      .replace('{{mobile}}', mobile)
      .replace('{{email}}', email)
      .replace('{{pincode}}', pincode)
      .replace('{{ordernumber}}', ordernumber)
      .replace('{{orderTotal}}', calculateTotal(cartItems))
      .replace('{{pdfUrl}}', pdfUrl || '#');

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

