// models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  id: { type: String, unique: true }, // WooCommerce order ID or Amazon Order ID
  status: String,
  total: String,
  currency: String,
  date_created: String,
  date_modified: String,
  customer_id: Number,
  billing: Object,
  shipping: Object,
  line_items: Array,
  source: { type: String, enum: ["woocommerce", "amazon"], required: true }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
