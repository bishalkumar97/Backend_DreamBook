// models/Analytics.js
const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  month: { type: String, unique: true }, // Format: YYYY-MM
  totalSales: Number,
  royalties: Number
}, { timestamps: true });

module.exports = mongoose.model("Analytics", analyticsSchema);
