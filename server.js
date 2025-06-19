// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const productRoutes = require('./routes/products');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use('/api/products', productRoutes);

// Simulated database (replace with actual DB logic)
const orders = {}; // key: orderNumber, value: orderData

function saveOrder(orderData) {
  orders[orderData.ordernumber] = { ...orderData, createdAt: new Date() };
}

function getOrderByNumber(orderNumber) {
  return orders[orderNumber];
}

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

function calculateSubtotal(cartItems = []) {
  return cartItems.reduce((tot, item) =>
    tot + (parseFloat(item.price ?? item.discountedPrice) || 0) *
          (parseInt(item.quantity) || 0), 0
  ).toFixed(2);
}

function calculateTotal(cartItems = []) {
  return (+calculateSubtotal(cartItems)).toFixed(2);
}

app.post('/send-email', async (req, res) => {
  try {
    const order = req.body;
    const html = `<p>Hi ${order.username}, your order has been placed successfully.</p>`;
    const mailOptions = {
      from: 'deepamcrackerssvks@gmail.com',
      to: order.email,
      subject: 'Order Confirmation - Deepam Crackers',
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, 'assets/logo.png'),
          cid: 'logo'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    saveOrder(order);
    res.status(200).json({ message: 'Email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error sending email', error: err.message });
  }
});

app.post('/send-admin-email', async (req, res) => {
  try {
    const order = req.body;
    const html = `<p>New order received: ${order.ordernumber}</p>`;
    const mailOptions = {
      from: 'deepamcrackerssvks@gmail.com',
      to: 'deepamcrackerssvks@gmail.com',
      subject: 'New Order - Deepam Crackers',
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, 'assets/logo.png'),
          cid: 'logo'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Admin email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error sending admin email', error: err.message });
  }
});

app.get('/api/download-pdf/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = getOrderByNumber(orderNumber);

    if (!order) return res.status(404).send('Order not found');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=order_${orderNumber}.pdf`
    );

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(20).text('Deepam Crackers', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Order Confirmation`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Order No: ${orderNumber}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    doc.text(`Name: ${order.username}`);
    doc.text(`Email: ${order.email}`);
    doc.text(`Mobile: ${order.mobile}`);
    doc.text(`Address: ${order.addressLine1}, ${order.addressLine2}, ${order.city}, ${order.state} - ${order.pincode}`);
    doc.moveDown();

    doc.text('Items:', { underline: true });
    order.cartItems.forEach((item, i) => {
      const price = item.price ?? item.discountedPrice;
      doc.text(`${i + 1}. ${item.name} - Qty: ${item.quantity} - ₹${price * item.quantity}`);
    });

    doc.moveDown();
    doc.text(`Subtotal: ₹${calculateSubtotal(order.cartItems)}`);
    doc.text(`Total: ₹${calculateTotal(order.cartItems)}`, { underline: true });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).send('Failed to generate PDF');
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));