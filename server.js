const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const productRoutes = require('./routes/products');
const rateLimit = require('express-rate-limit');

const app = express();

// Configuration
const CONFIG = {
  PORT: process.env.PORT || 5000,
  MAX_PAYLOAD_SIZE_MB: 20,
  SMTP_POOL_SIZE: 3,
  LOGO_PATH: path.join(__dirname, 'assets/logo-optimized.webp')
};

// Middleware setup
app.use(cors());
app.use('/api/products', productRoutes);
app.use(bodyParser.json({ limit: `${CONFIG.MAX_PAYLOAD_SIZE_MB}mb` }));
app.use(bodyParser.urlencoded({ limit: `${CONFIG.MAX_PAYLOAD_SIZE_MB}mb`, extended: true }));

// Rate limiting
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many requests, please try again later'
});
app.use('/send-order-emails', emailLimiter);

// Email transporter configuration
const transporter = nodemailer.createTransport({
  pool: true,
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'deepamcrackerssvks@gmail.com',
    pass: process.env.EMAIL_PASS || 'kmvp zous iowz nibw'
  },
  maxConnections: CONFIG.SMTP_POOL_SIZE,
  maxMessages: 5
});

// State management
let serverState = {
  templates: {
    customer: null,
    admin: null
  },
  isShuttingDown: false,
  activeRequests: 0
};

// Health check endpoint
app.get('/health', (req, res) => {
  if (serverState.isShuttingDown) {
    return res.status(503).json({ status: 'shutting_down' });
  }
  res.status(200).json({
    status: 'healthy',
    templatesLoaded: !!serverState.templates.customer && !!serverState.templates.admin,
    activeRequests: serverState.activeRequests
  });
});

// Request counting middleware
app.use((req, res, next) => {
  if (serverState.isShuttingDown) {
    return res.status(503).json({ error: 'Server is shutting down' });
  }
  serverState.activeRequests++;
  res.on('finish', () => serverState.activeRequests--);
  next();
});

// Template management
async function loadTemplates() {
  try {
    const [customer, admin] = await Promise.all([
      fs.readFile(path.join(__dirname, 'email_template.html'), 'utf8'),
      fs.readFile(path.join(__dirname, 'admin_email_template.html'), 'utf8')
    ]);
    serverState.templates = { customer, admin };
    console.log('Templates loaded successfully');
  } catch (error) {
    console.error('Failed to load templates:', error);
    setTimeout(loadTemplates, 30000);
  }
}

// Initial template load
loadTemplates().catch(console.error);

// Utility functions
function calculateCartTotals(cartItems) {
  const subtotal = cartItems.reduce((total, item) => {
    const price = parseFloat(item.price ?? item.discountedPrice) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return total + (price * quantity);
  }, 0);
  
  return {
    subtotal: subtotal.toFixed(2),
    total: subtotal.toFixed(2)
  };
}

function generateCartItemsHTML(cartItems) {
  return cartItems.map(item => {
    const price = item.price ?? item.discountedPrice ?? 0;
    const quantity = item.quantity || 0;
    const total = (quantity * price).toFixed(2);
    
    return `
    <tr>
      <td>${item.name || item.title || 'Unnamed Item'}</td>
      <td>${quantity}</td>
      <td>${price}</td>
      <td>${total}</td>
    </tr>`;
  }).join('');
}

function replaceTemplatePlaceholders(template, orderData, cartItemsHtml, totals) {
  const replacements = {
    username: orderData.username || '',
    cartItems: cartItemsHtml,
    orderSubtotal: totals.subtotal,
    addressLine1: orderData.addressLine1 || '',
    addressLine2: orderData.addressLine2 || '',
    state: orderData.state || '',
    city: orderData.city || '',
    mobile: orderData.mobile || '',
    email: orderData.email || '',
    pincode: orderData.pincode || '',
    ordernumber: orderData.ordernumber || '',
    orderTotal: totals.total,
    orderDate: new Date().toLocaleString()
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => replacements[key] || '');
}

// Email endpoint
app.post('/send-order-emails', async (req, res) => {
  const startTime = Date.now();
  const orderData = req.body;

  // Validate payload size
  const payloadSizeMB = Buffer.byteLength(JSON.stringify(orderData)) / (1024 * 1024);
  if (payloadSizeMB > CONFIG.MAX_PAYLOAD_SIZE_MB) {
    return res.status(413).json({
      success: false,
      message: `Payload too large. Maximum size is ${CONFIG.MAX_PAYLOAD_SIZE_MB}MB.`
    });
  }

  // Check templates
  if (!serverState.templates.customer || !serverState.templates.admin) {
    return res.status(503).json({
      success: false,
      message: 'Service initializing, please try again shortly'
    });
  }

  try {
    // Process cart
    const totals = calculateCartTotals(orderData.cartItems);
    const cartItemsHtml = generateCartItemsHTML(orderData.cartItems);

    // Prepare emails
    const [customerHtml, adminHtml] = await Promise.all([
      replaceTemplatePlaceholders(serverState.templates.customer, orderData, cartItemsHtml, totals),
      replaceTemplatePlaceholders(serverState.templates.admin, orderData, cartItemsHtml, totals)
    ]);

    // Email options
    const emailOptions = {
      customer: {
        from: process.env.EMAIL_USER || 'deepamcrackerssvks@gmail.com',
        to: orderData.email,
        subject: 'Your Deepam Crackers order confirmation',
        html: customerHtml
      },
      admin: {
        from: process.env.EMAIL_USER || 'deepamcrackerssvks@gmail.com',
        to: process.env.ADMIN_EMAIL || 'deepamcrackerssvks@gmail.com',
        subject: `New Order: ${orderData.ordernumber || 'No Number'}`,
        html: adminHtml
      }
    };

    // Send emails with timeout
    const emailTimeout = 10000; // 10 seconds timeout
    const emailPromises = [
      transporter.sendMail(emailOptions.customer),
      transporter.sendMail(emailOptions.admin)
    ].map(p => new Promise((resolve, reject) => {
      p.then(resolve).catch(reject);
      setTimeout(() => reject(new Error('Email sending timeout')), emailTimeout);
    }));

    const [customerResult, adminResult] = await Promise.all(emailPromises);

    console.log(`Emails sent in ${Date.now() - startTime}ms`);

    res.status(200).json({
      success: true,
      message: 'Emails sent successfully',
      processingTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending emails',
      error: error.message
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  serverState.isShuttingDown = true;

  const shutdownTimeout = setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);

  server.close(() => {
    clearTimeout(shutdownTimeout);
    console.log('Closed out remaining connections');
    process.exit(0);
  });
});

// Start server
const server = app.listen(CONFIG.PORT, () => {
  console.log(`Server running on port ${CONFIG.PORT}`);
});