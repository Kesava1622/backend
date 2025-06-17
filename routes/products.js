const express = require('express');
const router = express.Router();
const { db, storage, ref, uploadBytes, getDownloadURL } = require('../db');
const { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } = require("firebase/firestore");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Middleware for error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get all products (with optional category filter)
router.get('/products', asyncHandler(async (req, res) => {
  const { category } = req.query;
  const productsRef = collection(db, 'products');
  const snapshot = await getDocs(productsRef);
  
  let products = [];
  snapshot.forEach(doc => {
    const product = doc.data();
    if (!category || product.category === category) {
      products.push({ id: doc.id, ...product });
    }
  });
  
  res.json(products);
}));

// Get single product by ID
router.get('/products/:id', asyncHandler(async (req, res) => {
  const productRef = doc(db, 'products', req.params.id);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json({ id: productSnap.id, ...productSnap.data() });
}));

// Create new product (with image upload)
router.post('/products', upload.single('image'), asyncHandler(async (req, res) => {
  const { title, discountedPrice, discountPercent, category } = req.body;
  
  if (!title || !discountedPrice || !category) {
    return res.status(400).json({ error: 'Title, price and category are required' });
  }

  let imageUrl = null;
  if (req.file) {
    const storageRef = ref(storage, `products/${Date.now()}_${req.file.originalname}`);
    await uploadBytes(storageRef, req.file.buffer);
    imageUrl = await getDownloadURL(storageRef);
  }

  const productData = {
    title,
    discountedPrice: parseFloat(discountedPrice),
    discountPercent: discountPercent ? parseFloat(discountPercent) : null,
    image: imageUrl,
    category,
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, 'products'), productData);
  const newProduct = await getDoc(docRef);
  
  res.status(201).json({ id: docRef.id, ...newProduct.data() });
}));

// Update product (with optional image update)
router.put('/products/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, discountedPrice, discountPercent, category } = req.body;
  const productRef = doc(db, 'products', id);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) {
    return res.status(404).json({ error: 'Product not found' });
  }

  let imageUrl = productSnap.data().image;
  if (req.file) {
    // Upload new image
    const storageRef = ref(storage, `products/${Date.now()}_${req.file.originalname}`);
    await uploadBytes(storageRef, req.file.buffer);
    imageUrl = await getDownloadURL(storageRef);
    
    // TODO: Optionally delete old image from storage
  }

  const updateData = {
    title,
    discountedPrice: parseFloat(discountedPrice),
    discountPercent: discountPercent ? parseFloat(discountPercent) : null,
    image: imageUrl,
    category,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(productRef, updateData);
  const updatedProduct = await getDoc(productRef);
  
  res.json({ id: updatedProduct.id, ...updatedProduct.data() });
}));

// Delete product
router.delete('/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productRef = doc(db, 'products', id);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // TODO: Optionally delete associated image from storage
  await deleteDoc(productRef);
  
  res.json({ success: true, message: 'Product deleted successfully' });
}));

// Database connection test endpoint
router.get('/test-db', asyncHandler(async (req, res) => {
  try {
    const productsRef = collection(db, 'products');
    await getDocs(productsRef);
    res.json({ status: 'Firebase connected' });
  } catch (err) {
    throw new Error('Firebase connection failed');
  }
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