// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: { type: String, unique: true }, // Amazon ASIN or WooCommerce product ID
  asin: { type: String, unique: true, sparse: true }, // NEW_CHANGE
  name: String,
  price: String,
  description: String,
  short_description: String,
  sku: String,
  stock_quantity: Number,
  images: [{ src: String }],
  categories: [{ id: Number, name: String }],

  title: String,

  // NEW_CHANGE: Additional fields for Amazon attributes
  author_name: { type: String, default: "Unknown" }, // NEW_CHANGE
  publisher: { type: String, default: "" },          // NEW_CHANGE
  description: { type: String, default: "Incomplete product data" }, // NEW_CHANGE

  // For dimension/weight/binding
  pages: { type: Number, default: 0 },    // NEW_CHANGE
  item_weight: { type: String, default: "" },  // e.g. "0.4 kilograms" // NEW_CHANGE
  dimensions: { type: String, default: "" },   // e.g. "22 x 15 x 3 cm" // NEW_CHANGE
  // bindingSize: [{ type: String }],             // e.g. ["paperback"] // NEW_CHANGE
   // Add bindingSize as an array of strings
   bindingSize: [{ type: String }],
  date_modified: String,
  created_date: String,
  author_name: String,
  publisher: String,
  pages: Number,
  item_weight: String,
  dimensions: String,
  country_of_origin: String,
  packer: String,
  generic_name: String,
  unspsc_code: String,
    // You can store more fields like unspsc_code, brand, etc. if needed
    unspsc_code: { type: String, default: "" }, // NEW_CHANGE

  // Add platforms as an array of objects { platform: String, royalty: Number }
  platforms: [{
    platform: { type: String },
    royalty: { type: Number }
  }],
// Other fields
date_modified: String,
created_date: String,
author_name: String,
publisher: String,
pages: Number,
item_weight: String,
dimensions: String,
country_of_origin: String,
packer: String,
generic_name: String,
unspsc_code: String,

  source: { type: String, enum: ["woocommerce", "amazon", "kindle", "custom"], required: true }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
