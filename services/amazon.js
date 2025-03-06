// services/amazon.js
const SellingPartnerAPI = require("amazon-sp-api");
const Product = require("../models/Product");
const Order = require("../models/Order");

const amazonRefreshToken = process.env.AMAZON_REFRESH_TOKEN;
const amazonClientId = process.env.AMAZON_CLIENT_ID;
const amazonClientSecret = process.env.AMAZON_CLIENT_SECRET;

// Initialize the Amazon SP-API client
const spClient = new SellingPartnerAPI({
  region: "eu", // Use "eu" for India
  refresh_token: amazonRefreshToken,
  credentials: {
    SELLING_PARTNER_APP_CLIENT_ID: amazonClientId,
    SELLING_PARTNER_APP_CLIENT_SECRET: amazonClientSecret
  }
});

// Fetch Amazon orders from the SP-API
const fetchAmazonOrders = async () => {
  try {
    console.log("🔍 Fetching Amazon orders...");
    const orders = await spClient.callAPI({
      operation: "getOrders",
      endpoint: "orders",
      query: {
        MarketplaceIds: ["A21TJRUUN4KGV"],
        CreatedAfter: new Date(new Date() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        IncludeOrderItems: true
      }
    });

    console.log("📦 Full API Response:", JSON.stringify(orders, null, 2));
    if (!orders.Orders || !Array.isArray(orders.Orders)) {
      console.error("❌ No orders found or orders is not an array.");
      return [];
    }
    console.log(`✅ Fetched ${orders.Orders.length} Amazon orders.`);
    return orders.Orders;
  } catch (error) {
    console.error("❌ Error fetching Amazon orders:", error);
    return [];
  }
};

// Save Amazon orders to MongoDB
const saveAmazonOrders = async (orders) => {
  try {
    for (let order of orders) {
      const lineItems = order.OrderItems && Array.isArray(order.OrderItems)
        ? order.OrderItems.map(item => ({
            id: item.ASIN,
            name: item.Title,
            quantity: item.QuantityOrdered,
            price: item.ItemPrice?.Amount || "0.00"
          }))
        : [];

      await Order.findOneAndUpdate(
        { id: order.AmazonOrderId },
        {
          id: order.AmazonOrderId,
          status: order.OrderStatus,
          total: order.OrderTotal?.Amount || "0.00",
          currency: order.OrderTotal?.CurrencyCode || "USD",
          date_created: order.PurchaseDate,
          line_items: lineItems,
          source: "amazon"
        },
        { upsert: true }
      );
      console.log(`✅ Amazon Order ID ${order.AmazonOrderId} saved/updated in MongoDB.`);
    }
  } catch (error) {
    console.error("❌ Error saving Amazon orders:", error);
  }
};

// Fetch Amazon products using ASINs from orders
const fetchAmazonProducts = async () => {
  try {
    console.log("🔍 Fetching Amazon products...");

    // First, fetch Amazon orders
    const orders = await fetchAmazonOrders();
    console.log("📦 Sample Order Structure:", JSON.stringify(orders[0], null, 2));

    if (!orders || !Array.isArray(orders)) {
      console.error("❌ No orders found or orders is not an array.");
      return;
    }

    // Extract unique ASINs from the orders
    const asins = [];
    for (let order of orders) {
      try {
        const orderItems = await spClient.callAPI({
          operation: "getOrderItems",
          endpoint: "orders",
          path: { orderId: order.AmazonOrderId }
        });

        if (orderItems.OrderItems && Array.isArray(orderItems.OrderItems)) {
          for (let item of orderItems.OrderItems) {
            if (item.ASIN) {
              asins.push(item.ASIN);
            } else {
              console.warn("⚠️ Missing ASIN in OrderItem:", item);
            }
          }
        } else {
          console.warn("⚠️ Missing or invalid OrderItems in order:", order.AmazonOrderId);
        }
      } catch (error) {
        console.error(`❌ Error fetching order items for order ${order.AmazonOrderId}:`, error);
      }
    }

    console.log(`🔍 Found ${asins.length} ASINs in orders.`);
    // Remove duplicates
    const uniqueAsins = [...new Set(asins)];

    // Fetch product details for each ASIN and save to MongoDB
    for (let asin of uniqueAsins) {
      try {
        const product = await spClient.callAPI({
          operation: "getCatalogItem",
          endpoint: "catalogItems",
          path: { asin },
          query: {
            marketplaceIds: ["A21TJRUUN4KGV"],
            includedData: "summaries,images,attributes" 
          }
        });

        console.log("📦 Product Response for ASIN:", asin, JSON.stringify(product, null, 2));

        // if (!product || !product.summaries || !Array.isArray(product.summaries) || product.summaries.length === 0) {
        //   console.warn(`⚠️ Missing or incomplete product data for ASIN ${asin}`);
        //   continue;
        // }

         // CHANGE: Handle missing or incomplete product data.
         let productSummary;
         if (product.summaries && Array.isArray(product.summaries) && product.summaries.length > 0) {
           productSummary = product.summaries[0];
         } else if (product.asin) {
           // Fallback when summaries are missing
           productSummary = {
             itemName: "Product " + product.asin,  // Fallback title using ASIN
             description: "Incomplete product data", // Default description
             shortDescription: "Incomplete product data",
             images: [] // Initialize images array
           };
           // CHANGE: Try to extract images from the top-level images field
           if (product.images && Array.isArray(product.images) && product.images.length > 0) {
             const marketplaceImages = product.images[0]; // Taking the first marketplace object
             if (marketplaceImages.images && Array.isArray(marketplaceImages.images) && marketplaceImages.images.length > 0) {
               // Prefer MAIN variant if available; otherwise, use the first image
               const mainImage = marketplaceImages.images.find(img => img.variant === "MAIN") || marketplaceImages.images[0];
               // Note: Amazon returns "link" as the URL field; we adjust to our expected format.
               productSummary.images.push({ url: mainImage.link });
             }
           }
         } else {
           console.warn(`⚠️ Missing or incomplete product data for ASIN ${asin}`);
           continue;
         }

        // const productSummary = product.summaries[0];
        const price = await fetchProductPrice(asin);

        // Summaries -> get itemName as title if present
        let title = "No title available";
        if (product.summaries && Array.isArray(product.summaries) && product.summaries.length > 0) {
          if (product.summaries[0].itemName) {
            title = product.summaries[0].itemName;
          }
        }

        // CHANGE: Extract image URL from productSummary if available
        let imageUrl = "";
        if (productSummary.images && Array.isArray(productSummary.images) && productSummary.images.length > 0) {
          imageUrl = productSummary.images[0].url; // <-- NEW: Extract image URL
        }
      

    
        // const additionalDetails = {
        //   publisher: "Dreambook Publishing",
        //   pages: 43,
        //   item_weight: "300 g",
        //   dimensions: "22 x 15 x 3 cm",
        //   country_of_origin: "India",
        //   packer: "info@dreambookpublishing.com",
        //   generic_name: "Book",
        //   unspsc_code: "55101500"
        // };

        await Product.findOneAndUpdate(
          { id: asin },
          {
            id: asin,
            name: productSummary.itemName || "No title available",
            price: price,
            description: productSummary.description || "No description available",
            short_description: productSummary.shortDescription || "No short description available",
            // sku: asin,
            stock_quantity: 0, // Amazon does not provide stock quantity directly
            // images: [],
            images: imageUrl ? [{ src: imageUrl }] : [], // <-- NEW: Save image URL in the images array
            categories: [],
            date_modified: new Date().toISOString(),
            created_date: new Date().toISOString(),
            author_name: productSummary.manufacturer || "Unknown",
            source: "amazon",

          },
          { upsert: true }
        );

        console.log(`✅ Amazon Product ID ${asin} saved/updated in MongoDB.`);
      } catch (error) {
        console.error(`❌ Error fetching product details for ASIN ${asin}:`, error);
      }
    }
  } catch (error) {
    console.error("❌ Error fetching Amazon products:", error);
  }
};

// Fetch product price from Amazon SP-API
const fetchProductPrice = async (asin) => {
  try {
    const response = await spClient.callAPI({
      operation: "getItemOffers",
      endpoint: "productPricing",
      query: {
        MarketplaceId: "A21TJRUUN4KGV",
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

module.exports = {
  fetchAmazonOrders,
  saveAmazonOrders,
  fetchAmazonProducts,
  fetchProductPrice
};
