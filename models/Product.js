// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: { type: String, unique: true }, // Amazon ASIN or WooCommerce product ID
  name: String,
  price: String,
  description: String,
  short_description: String,
  sku: String,
  stock_quantity: Number,
  images: [{ src: String }],
  categories: [{ id: Number, name: String }],
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
  source: { type: String, enum: ["woocommerce", "amazon"], required: true }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
