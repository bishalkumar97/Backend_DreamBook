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

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "❌ MongoDB Connection Error:"));
db.once("open", () => console.log("✅ Connected to MongoDB"));

// (Optional) Define API endpoints for your frontend here if needed

// Schedule Cron Jobs to run at minute 0 of every hour
cron.schedule("0 * * * *", async () => {
  console.log("🕒 Running scheduled tasks...");
  await wooCommerceService.fetchProducts();              // Sync WooCommerce products
  await wooCommerceService.fetchOrders();                // Sync WooCommerce orders
  const amazonOrders = await amazonService.fetchAmazonOrders(); // Fetch Amazon orders
  await amazonService.saveAmazonOrders(amazonOrders);      // Save Amazon orders to DB
  await amazonService.fetchAmazonProducts();             // Sync Amazon products
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
  const monthlySales = await wooCommerceService.calculateMonthlySales();
  await wooCommerceService.calculateRoyalties(monthlySales);
});
