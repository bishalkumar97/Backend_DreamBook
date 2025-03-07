const SellingPartnerAPI = require("amazon-sp-api");
const Product = require("../models/Product");
const Order = require("../models/Order");

const amazonRefreshToken = process.env.AMAZON_REFRESH_TOKEN;
const amazonClientId = process.env.AMAZON_CLIENT_ID;
const amazonClientSecret = process.env.AMAZON_CLIENT_SECRET;

// Initialize the Amazon SP-API client
const spClient = new SellingPartnerAPI({
  region: "eu", // Use "eu" for India (change if needed)
  refresh_token: amazonRefreshToken,
  credentials: {
    SELLING_PARTNER_APP_CLIENT_ID: amazonClientId,
    SELLING_PARTNER_APP_CLIENT_SECRET: amazonClientSecret
  }
});

// ------------------------
// Helper: Fetch product price using getItemOffers
// ------------------------
const fetchProductPrice = async (asin) => {
  try {
    const response = await spClient.callAPI({
      operation: "getItemOffers",
      endpoint: "productPricing",
      query: {
        marketplaceIds: "A21TJRUUN4KGV", // CHANGE HERE if necessary
        ItemCondition: "New"
      },
      path: { Asin: asin }
    });
    return response.Offers[0]?.ListingPrice?.Amount || "0.00";
  } catch (error) {
    console.error(`❌ Error fetching price for ASIN ${asin}:`, error);
    return "0.00";
  }
};

// ========================
// Section 1: Fetch Kindle Products
// ========================
const fetchKindleProducts = async () => {
  try {
    console.log("🔍 Fetching Kindle products...");

    // Use the searchCatalogItems operation with a Kindle-specific keyword.
    // Note: The endpoint must be "catalogItems" (not "catalog").
    const products = await spClient.callAPI({
      operation: "searchCatalogItems",
      endpoint: "catalogItems",
      query: {
        MarketplaceId: "A21TJRUUN4KGV", // CHANGE HERE if needed
        Keywords: "Kindle E-reader"      // Adjust keyword as needed (e.g., "Amazon Kindle")
      }
    });

    // Log the raw API response for debugging
    console.log("🔍 Raw Kindle API Response:", JSON.stringify(products, null, 2));

    if (!products.Items || !Array.isArray(products.Items)) {
      console.error("❌ No Kindle products returned or invalid structure.");
      return [];
    }
    console.log(`✅ Fetched ${products.Items.length} Kindle products.`);

    // Process each product and update the Product collection in MongoDB
    for (let item of products.Items) {
      // Ensure the item has a summaries array with key details
      if (!item.summaries || !Array.isArray(item.summaries) || item.summaries.length === 0) {
        console.warn("⚠️ No summaries for item, skipping", item);
        continue;
      }
      const summary = item.summaries[0];
      const asin = summary.asin || summary.ASIN;
      if (!asin) {
        console.warn("⚠️ ASIN not found for item, skipping", item);
        continue;
      }
      const price = await fetchProductPrice(asin);

      // Save or update the product in MongoDB using the same structure as in amazon.js
      await Product.findOneAndUpdate(
        { id: asin },
        {
          id: asin,
          name: summary.itemName || "No title available",
          price: price,
          description: summary.description || "No description available",
          short_description: summary.shortDescription || "No short description available",
          sku: asin,                     // Using ASIN as SKU
          stock_quantity: 0,             // Kindle products may not report stock quantity
          images: (summary.images && Array.isArray(summary.images) && summary.images.length > 0)
                    ? summary.images.map(img => ({ src: img.link || img.url }))
                    : [],
          categories: [],                // Adjust if you want to extract categories
          date_modified: new Date().toISOString(),
          created_date: new Date().toISOString(),
          author_name: summary.manufacturer || "Unknown",
          source: "kindle"               // Mark as a Kindle product
        },
        { upsert: true }
      );
      console.log(`✅ Kindle product ${asin} saved/updated in MongoDB.`);
    }
    return products.Items;
  } catch (error) {
    console.error("❌ Error fetching Kindle products:", error);
    return [];
  }
};

// ========================
// Section 2: Fetch Kindle Orders & Calculate Analytics
// ========================

// Fetch all Amazon orders (using the same getOrders endpoint as in amazon.js)
const fetchAllAmazonOrders = async () => {
  try {
    console.log("🔍 Fetching Amazon orders...");
    const orders = await spClient.callAPI({
      operation: "getOrders",
      endpoint: "orders",
      query: {
        marketplaceIds: ["A21TJRUUN4KGV"],
        includedData: "summaries,images,attributes" 
      }
    });
    if (!orders.Orders || !Array.isArray(orders.Orders)) {
      console.error("❌ No orders found or orders is not an array.");
      return [];
    }
    console.log(`✅ Fetched ${orders.Orders.length} orders.`);
    return orders.Orders;
  } catch (error) {
    console.error("❌ Error fetching Amazon orders:", error);
    return [];
  }
};

// Filter orders to include only those with Kindle products (by cross‑referencing our Product collection)
const fetchKindleOrders = async () => {
  try {
    console.log("🔍 Fetching Kindle orders...");
    const orders = await fetchAllAmazonOrders();
    console.log("📦 All orders fetched. Filtering for Kindle orders...");

    // Retrieve all Kindle products from MongoDB (their IDs are ASINs)
    const kindleProducts = await Product.find({ source: "kindle" }).select("id").lean();
    const kindleASINSet = new Set(kindleProducts.map(p => p.id));

    // Filter orders: keep orders where at least one OrderItem's ASIN is in the kindleASINSet
    const kindleOrders = orders.filter(order => {
      if (order.OrderItems && Array.isArray(order.OrderItems)) {
        return order.OrderItems.some(item => kindleASINSet.has(item.ASIN));
      }
      return false;
    });

    console.log(`✅ Found ${kindleOrders.length} Kindle orders.`);
    return kindleOrders;
  } catch (error) {
    console.error("❌ Error fetching Kindle orders:", error);
    return [];
  }
};

// Calculate basic analytics for Kindle orders (e.g., total sales)
const calculateKindleAnalytics = async () => {
  try {
    const kindleOrders = await fetchKindleOrders();
    let totalSales = 0;
    kindleOrders.forEach(order => {
      totalSales += parseFloat(order.OrderTotal?.Amount || "0");
    });
    console.log(`✅ Total Kindle Sales: ${totalSales}`);
    return { totalSales };
  } catch (error) {
    console.error("❌ Error calculating Kindle analytics:", error);
    return {};
  }
};

module.exports = {
  fetchKindleProducts,
  fetchKindleOrders,
  calculateKindleAnalytics,
  fetchAllAmazonOrders // optional, if you need it externally
};
