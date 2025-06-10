const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all products by category
router.get('/:category', async (req, res) => {
  const { category } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE category = ?', [category]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add a product
router.post('/', async (req, res) => {
    const { title, discountedPrice, discountPercent, image, category } = req.body;
    try {
      await db.query(
        'INSERT INTO products (title, discountedPrice, discountPercent, image, category) VALUES (?, ?, ?, ?, ?)',
        [title, discountedPrice, discountPercent, image, category]
      );
      console.log(db.query); // ← this is incorrect
      res.json({ success: true , insertId: result.insertId  }); // ← `result` is not defined
    } catch (err) {
      console.error('Insert failed:', err); // ← `error` is not defined
      res.status(500).json({ error: 'Insert failed' });
    }
  });
  

// Update product
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, discountedPrice, discountPercent, image } = req.body;
  try {
    await db.query(
      'UPDATE products SET title=?, discountedPrice=?, discountPercent=?, image=? WHERE id=?',
      [title, discountedPrice, discountPercent, image, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
