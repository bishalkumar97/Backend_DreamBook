// server.js
console.log("🔍 Starting server.js...");

require("dotenv").config({ path: "./.env" });
console.log("🔍 Environment variables loaded.");

const express = require("express");
const bodyParser = require("body-parser");
const cron = require("node-cron");
const mongoose = require("mongoose");

// Import the WooCommerce and Amazon service functions
const wooCommerceService = require("./services/woocommerce");
const amazonService = require("./services/amazon");
const kindleService = require("./services/kindle");

// NEW: Import the authors route
const authorsRoute = require("./routes/authors");

// ADD THIS: import our new books route
const booksRoute = require("./routes/books");

// NEW CHANGE #1: Import the new books-info route to fetch combined books info (products and analytics)
const booksInfoRoute = require("./routes/books-info");

const app = express();
app.use(bodyParser.json());

// Serve static files in "uploads" so images can be accessed
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "❌ MongoDB Connection Error:"));
db.once("open", () => console.log("✅ Connected to MongoDB"));

// Use the books route
app.use("/api/books", booksRoute);
app.use("/api/authors", authorsRoute);
// NEW CHANGE #2: Use the new books-info route for fetching books info (products and analytics)
app.use("/api/books-info", booksInfoRoute);

// Test fetching Kindle products
app.get('/test-kindle-products', async (req, res) => {
  try {
    const data = await kindleService.fetchKindleProducts();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching Kindle products" });
  }
});

// Test fetching Kindle orders
app.get('/test-kindle-orders', async (req, res) => {
  try {
    const orders = await kindleService.fetchKindleOrders();
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching Kindle orders" });
  }
});

// Test calculating Kindle analytics
app.get('/test-kindle-analytics', async (req, res) => {
  try {
    const analytics = await kindleService.calculateKindleAnalytics();
    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error calculating Kindle analytics" });
  }
});

// (Optional) Define API endpoints for your frontend here if needed

// Schedule Cron Jobs to run at minute 0 of every hour
cron.schedule("0 * * * *", async () => {
  console.log("🕒 Running scheduled tasks...");
  await wooCommerceService.fetchProducts();              // Sync WooCommerce products
  await wooCommerceService.fetchOrders();                // Sync WooCommerce orders
  const amazonOrders = await amazonService.fetchAmazonOrders(); // Fetch Amazon orders
  await amazonService.saveAmazonOrders(amazonOrders);      // Save Amazon orders to DB
  await amazonService.fetchAmazonProducts();             // Sync Amazon products
  await kindleService.fetchKindleProducts(); // NEW: Fetch Kindle products
  const monthlySales = await wooCommerceService.calculateMonthlySales(); // Calculate monthly sales
  await wooCommerceService.calculateRoyalties(monthlySales);             // Calculate royalties
  console.log("✅ Scheduled tasks completed.");
});

// Start the Express server and run tasks on startup
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await wooCommerceService.fetchProducts();
  await wooCommerceService.fetchOrders();
  const amazonOrders = await amazonService.fetchAmazonOrders();
  await amazonService.saveAmazonOrders(amazonOrders);
  await amazonService.fetchAmazonProducts();
  await kindleService.fetchKindleProducts(); // NEW: Fetch Kindle products
  const monthlySales = await wooCommerceService.calculateMonthlySales();
  await wooCommerceService.calculateRoyalties(monthlySales);
});


// Add in server.js
app.get('/test-kindle', async (req, res) => {
  try {
    const kindleData = await require('./services/kindle').fetchKindleProducts();
    res.json({ success: true, data: kindleData });
  } catch (error) {
    console.error("Error fetching Kindle data:", error);
    res.status(500).json({ success: false, message: "Error fetching Kindle data" });
  }
});
