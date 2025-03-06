// syncUpdates.js
// This file automatically updates MongoDB with the latest data from the website (WooCommerce)
// and Amazon by fetching changes and updating/creating records in the database.

// Load environment variables from .env
require("dotenv").config({ path: "./.env" });

// Import Mongoose to connect to MongoDB
const mongoose = require("mongoose");

// Connect to MongoDB using the URI from the environment file
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ Connected to MongoDB for syncUpdates"))
  .catch((err) => console.error("❌ MongoDB Connection Error in syncUpdates:", err));

// Import our service modules which contain functions to fetch data and update MongoDB.
const wooCommerceService = require("./services/woocommerce");
const amazonService = require("./services/amazon");

/**
 * The async function 'syncUpdates' calls the service functions to fetch and update data.
 * It first updates WooCommerce products and orders, then (if needed) updates Amazon orders
 * and products in MongoDB.
 */
async function syncUpdates() {
  console.log("🔄 Starting sync updates...");

  try {
    // Update WooCommerce data:
    await wooCommerceService.fetchProducts();
    await wooCommerceService.fetchOrders();

    // Update Amazon data:
    const amazonOrders = await amazonService.fetchAmazonOrders();
    await amazonService.saveAmazonOrders(amazonOrders);
    await amazonService.fetchAmazonProducts();

    console.log("✅ Sync updates complete.");
  } catch (error) {
    console.error("❌ Error during sync updates:", error);
  }
}

// Run syncUpdates once immediately
syncUpdates();

// Then schedule syncUpdates to run automatically every 10 minutes.
// The interval is set in milliseconds: 10 minutes = 10 * 60 * 1000 ms.
setInterval(syncUpdates, 10 * 60 * 1000);
