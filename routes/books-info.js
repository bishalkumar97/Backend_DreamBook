// routes/books-info.js
const express = require("express");
const Product = require("../models/Product");
const Analytics = require("../models/Analytics");

const router = express.Router();

// This route fetches all products (books) and analytics data from MongoDB
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    const analytics = await Analytics.find();
    const orders = await orders.find(); // NEW CHANGE: Fetch orders
    
    res.json({ success: true, products, analytics, orders });
  } catch (error) {
    console.error("❌ Error fetching books information:", error);
    res.status(500).json({ success: false, message: "Error fetching books information", error: error.message });
  }
});

module.exports = router;
