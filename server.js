const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const compression = require('compression');
const productRoutes = require('./routes/products');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware setup
app.use(cors());
app.use(compression()); // Enable response compression
app.use('/api/products', productRoutes);

// Configure body parser with reasonable limits
app.use(bodyParser.json({ limit: '5mb' })); // Reduced from 100MB to 5MB
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

// Rate limiting to prevent abuse
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many email requests from this IP, please try again later'
});
app.use('/send-order-emails', emailLimiter);

// Email transporter configuration with connection pooling
const transporter = nodemailer.createTransport({
  pool: true,
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'deepamcrackerssvks@gmail.com',
    pass: 'kmvp zous iowz nibw'
  },
  maxConnections: 5,
  maxMessages: 10
});

// Cache email templates in memory
let templates = {
  customer: null,
  admin: null
};

async function loadTemplates() {
  try {
    [templates.customer, templates.admin] = await Promise.all([
      fs.readFile(path.join(__dirname, 'email_template.html'), 'utf8'),
      fs.readFile(path.join(__dirname, 'admin_email_template.html'), 'utf8')
    ]);
    console.log('Email templates loaded successfully');
  } catch (error) {
    console.error('Failed to load email templates:', error);
    // Retry after 30 seconds if failed
    setTimeout(loadTemplates, 30000);
  }
}

// Load templates at startup
loadTemplates();

// Utility functions
function calculateSubtotal(cartItems) {
  return cartItems.reduce((total, item) => {
    const price = parseFloat(item.price ?? item.discountedPrice) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return total + (price * quantity);
  }, 0).toFixed(2);
}

function calculateTotal(cartItems) {
  return calculateSubtotal(cartItems); // If there's no tax/shipping, same as subtotal
}

function generateCartItemsHTML(cartItems) {
  // Optimized to handle large arrays efficiently
  let html = '';
  for (const item of cartItems) {
    const price = item.price ?? item.discountedPrice ?? 0;
    const quantity = item.quantity || 0;
    const total = (quantity * price).toFixed(2);
    
    html += `
    <tr>
      <td>${item.name || item.title || 'Unnamed Item'}</td>
      <td>${quantity}</td>
      <td>${price}</td>
      <td>${total}</td>
    </tr>`;
  }
  return html;
}

function replaceTemplatePlaceholders(template, orderData, cartItemsHtml) {
  // Pre-calculate values to avoid repeated calculations
  const subtotal = calculateSubtotal(orderData.cartItems);
  const total = calculateTotal(orderData.cartItems);
  
  // Use a single replace operation with a callback for better performance
  return template.replace(/\{\{(\w+)\}\}/g, (match, p1) => {
    switch(p1) {
      case 'username': return orderData.username || '';
      case 'cartItems': return cartItemsHtml;
      case 'orderSubtotal': return subtotal;
      case 'addressLine1': return orderData.addressLine1 || '';
      case 'addressLine2': return orderData.addressLine2 || '';
      case 'state': return orderData.state || '';
      case 'city': return orderData.city || '';
      case 'mobile': return orderData.mobile || '';
      case 'email': return orderData.email || '';
      case 'pincode': return orderData.pincode || '';
      case 'ordernumber': return orderData.ordernumber || '';
      case 'orderTotal': return total;
      default: return match;
    }
  });
}

// Combined email endpoint
app.post('/send-order-emails', async (req, res) => {
  try {
    const startTime = Date.now();
    const orderData = req.body;

    // Validate payload size before processing
    const payloadSizeMB = Buffer.byteLength(JSON.stringify(orderData)) / (1024 * 1024);
    if (payloadSizeMB > 5) { // 5MB limit
      return res.status(413).json({
        success: false,
        message: 'Payload too large. Maximum size is 5MB.'
      });
    }

    // Check if templates are loaded
    if (!templates.customer || !templates.admin) {
      throw new Error('Email templates not loaded yet');
    }

    // Process cart items efficiently
    const cartItemsHtml = generateCartItemsHTML(orderData.cartItems);

    // Prepare email contents
    const [customerHtml, adminHtml] = await Promise.all([
      replaceTemplatePlaceholders(templates.customer, orderData, cartItemsHtml),
      replaceTemplatePlaceholders(templates.admin, orderData, cartItemsHtml)
    ]);

    // Email options
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
        path: path.join(__dirname, 'assets/logo-optimized.png'), // Use optimized image
        cid: 'logo'
      }]
    };

    // Send emails in parallel
    const [customerResult, adminResult] = await Promise.all([
      transporter.sendMail(customerMailOptions),
      transporter.sendMail(adminMailOptions)
    ]);

    const processingTime = Date.now() - startTime;
    console.log(`Emails sent in ${processingTime}ms. Payload size: ${payloadSizeMB.toFixed(2)}MB`);

    res.status(200).json({ 
      success: true,
      message: 'Both emails sent successfully',
      processingTime: `${processingTime}ms`
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    templatesLoaded: !!templates.customer && !!templates.admin
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Periodically reload templates (every 6 hours)
setInterval(loadTemplates, 6 * 60 * 60 * 1000);