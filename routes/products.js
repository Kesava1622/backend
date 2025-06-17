const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware for error handling and logging
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get all products (with optional category filter)
router.get('/products', asyncHandler(async (req, res) => {
  const { category } = req.query;
  
  let query = 'SELECT * FROM products';
  const params = [];
  
  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }
  
  const [products] = await db.query(query, params);
  res.json(products);
}));

// Get single product by ID
router.get('/products/:id', asyncHandler(async (req, res) => {
  const [product] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  
  if (!product.length) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json(product[0]);
}));

// Create new product
router.post('/products', asyncHandler(async (req, res) => {
  const { title, discountedPrice, discountPercent, image, category } = req.body;
  
  // Basic validation
  if (!title || !discountedPrice || !category) {
    return res.status(400).json({ error: 'Title, price and category are required' });
  }

  const [result] = await db.query(
    'INSERT INTO products (title, discountedPrice, discountPercent, image, category) VALUES (?, ?, ?, ?, ?)',
    [title, discountedPrice, discountPercent || null, image || null, category]
  );

  // Return the newly created product
  const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
  res.status(201).json(newProduct[0]);
}));

// Update product
router.put('/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, discountedPrice, discountPercent, image, category } = req.body;

  // Check if product exists
  const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'Product not found' });
  }

  await db.query(
    'UPDATE products SET title=?, discountedPrice=?, discountPercent=?, image=?, category=? WHERE id=?',
    [title, discountedPrice, discountPercent || null, image || null, category, id]
  );

  // Return the updated product
  const [updatedProduct] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  res.json(updatedProduct[0]);
}));

// Delete product
router.delete('/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if product exists
  const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'Product not found' });
  }

  await db.query('DELETE FROM products WHERE id=?', [id]);
  res.json({ success: true, message: 'Product deleted successfully' });
}));

// Database connection test endpoint
router.get('/test-db', asyncHandler(async (req, res) => {
  const [rows] = await db.query('SELECT 1');
  res.json({ status: 'DB connected', result: rows });
}));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

module.exports = router;