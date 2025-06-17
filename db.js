require('dotenv').config();
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } = require("firebase/firestore");

// Debug: Log the environment variables being used
console.log('Firebase Configuration:', {
  projectId: process.env.FIREBASE_PROJECT_ID,
});

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test connection to Firestore
const testFirebaseConnection = async () => {
  try {
    const productsRef = collection(db, "products");
    await getDocs(productsRef);
    console.log('✅ Successfully connected to Firebase Firestore');
    return true;
  } catch (err) {
    console.error('❌ Firebase connection failed:', err.message);
    console.log('Current environment configuration:', {
      projectId: process.env.FIREBASE_PROJECT_ID,
      apiKey: process.env.FIREBASE_API_KEY ? '***********' : 'MISSING'
    });
    process.exit(1);
  }
};

// Product CRUD Operations
const productOperations = {
  /**
   * Get all products from Firestore
   * @returns {Promise<Array>} Array of product objects
   */
  getAllProducts: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting products:", error);
      throw error;
    }
  },

  /**
   * Add a new product to Firestore
   * @param {Object} productData - Product data to add
   * @returns {Promise<string>} ID of the newly created product
   */
  addProduct: async (productData) => {
    try {
      const docRef = await addDoc(collection(db, "products"), productData);
      return docRef.id;
    } catch (error) {
      console.error("Error adding product:", error);
      throw error;
    }
  },

  /**
   * Update an existing product in Firestore
   * @param {string} productId - ID of the product to update
   * @param {Object} updateData - Data to update
   */
  updateProduct: async (productId, updateData) => {
    try {
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, updateData);
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  },

  /**
   * Delete a product from Firestore
   * @param {string} productId - ID of the product to delete
   */
  deleteProduct: async (productId) => {
    try {
      const productRef = doc(db, "products", productId);
      await deleteDoc(productRef);
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  },

  /**
   * Get a single product by ID
   * @param {string} productId - ID of the product to retrieve
   * @returns {Promise<Object|null>} Product data or null if not found
   */
  getProductById: async (productId) => {
    try {
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);
      return productSnap.exists() ? { id: productSnap.id, ...productSnap.data() } : null;
    } catch (error) {
      console.error("Error getting product:", error);
      throw error;
    }
  }
};

// Initialize and verify connection
(async () => {
  await testFirebaseConnection();
})();

module.exports = {
  db,
  ...productOperations
};