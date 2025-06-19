const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const productRoutes = require('./routes/products');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use('/api/products', productRoutes);

// Email transporter configuration
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

// Utility functions
function calculateSubtotal(cartItems) {
  return cartItems.reduce((total, item) => {
    const price = parseFloat(item.price ?? item.discountedPrice) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return total + price * quantity;
  }, 0).toFixed(2);
}


function calculateTotal(cartItems) {
  const subtotal = calculateSubtotal(cartItems);
  return (parseFloat(subtotal)).toFixed(2);
}

function generateCartItemsHTML(cartItems) {
  return cartItems.map(item => `
    <tr>
      <td>${item.name || item.title || 'Unnamed Item'}</td>
      <td>${item.quantity || 0}</td>
      <td>${item.price ?? item.discountedPrice ?? 0}</td>
      <td>${((item.quantity || 0) * (item.price ?? item.discountedPrice ?? 0)).toFixed(2)}</td>
    </tr>
  `).join('');
}

function replaceTemplatePlaceholders(template, orderData, cartItemsHtml) {
  return template
    .replaceAll('{{username}}', orderData.username)
    .replaceAll('{{cartItems}}', cartItemsHtml)
    .replaceAll('{{orderSubtotal}}', calculateSubtotal(orderData.cartItems))
    .replaceAll('{{addressLine1}}', orderData.addressLine1)
    .replaceAll('{{addressLine2}}', orderData.addressLine2)
    .replaceAll('{{state}}', orderData.state)
    .replaceAll('{{city}}', orderData.city)
    .replaceAll('{{mobile}}', orderData.mobile)
    .replaceAll('{{email}}', orderData.email)
    .replaceAll('{{pincode}}', orderData.pincode)
    .replaceAll('{{ordernumber}}', orderData.ordernumber)
    .replaceAll('{{orderTotal}}', calculateTotal(orderData.cartItems));
}

// Combined email endpoint
app.post('/send-order-emails', async (req, res) => {
  try {
    const orderData = req.body;
    const cartItemsHtml = generateCartItemsHTML(orderData.cartItems);

    // Read both templates simultaneously
    const [customerTemplate, adminTemplate] = await Promise.all([
      fs.promises.readFile(path.join(__dirname, 'email_template.html'), 'utf8'),
      fs.promises.readFile(path.join(__dirname, 'admin_email_template.html'), 'utf8')
    ]);

    // Prepare both email contents
    const customerHtml = replaceTemplatePlaceholders(customerTemplate, orderData, cartItemsHtml);
    const adminHtml = replaceTemplatePlaceholders(adminTemplate, orderData, cartItemsHtml);

    // Create both email options
    const customerMailOptions = {
      from: 'deepamcrackerssvks@gmail.com',
      to: orderData.email,
      subject: 'Your Deepam Crackers order has been received',
      html: customerHtml,
    };

    const adminMailOptions = {
      from: 'deepamcrackerssvks@gmail.com',
      to: 'deepamcrackerssvks@gmail.com',
      subject: 'New Order Received - Deepam Crackers',
      html: adminHtml,
      attachments: [{
        filename: 'logo.png',
        path: path.join(__dirname, 'assets/logo.png'),
        cid: 'logo'
      }]
    };

    // Send both emails in parallel
    const [customerResult, adminResult] = await Promise.all([
      transporter.sendMail(customerMailOptions),
      transporter.sendMail(adminMailOptions)
    ]);

    console.log('Customer email sent:', customerResult.response);
    console.log('Admin email sent:', adminResult.response);

    res.status(200).json({ 
      success: true,
      message: 'Both emails sent successfully',
      customerEmail: customerResult.response,
      adminEmail: adminResult.response
    });

  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error sending one or both emails',
      error: error.message 
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});