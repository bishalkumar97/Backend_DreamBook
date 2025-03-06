// routes/books.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const Product = require("../models/Product");

const router = express.Router();

// MULTER SETUP: store uploaded cover images in ./uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure this folder exists in your project root
  },
  filename: (req, file, cb) => {
    // Use the current timestamp + original filename to avoid name collisions
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ------------------- CREATE NEW BOOK -------------------
router.post("/", upload.single("coverImage"), async (req, res) => {
  try {
    // Extract text fields from the form
    const {
      title,
      subtitle,
      shortDescription,
      isbnNumber,
      author,
      category,
      language,
      price,
      
      // NEW FIELDS
      bindingSize,  // Expect an array of strings (e.g. ["Paper Back", "Hard Cover"])
      platforms     // Expect an array of objects (e.g. [{ platform: "dreambook", royalty: 50 }, { platform: "amazon", royalty: 30 }])
    } = req.body;

    // If bindingSize or platforms come as JSON strings, parse them
    let bindingSizeArray = [];
    let platformsArray = [];

    // If the frontend sends bindingSize as a JSON array string, parse it
    if (typeof bindingSize === "string") {
      try {
        bindingSizeArray = JSON.parse(bindingSize);
      } catch (err) {
        // If parsing fails, assume it's just a single string
        bindingSizeArray = [bindingSize];
      }
    } else if (Array.isArray(bindingSize)) {
      // If the frontend directly sends an array
      bindingSizeArray = bindingSize;
    }

    // Same logic for platforms
    if (typeof platforms === "string") {
      try {
        platformsArray = JSON.parse(platforms);
      } catch (err) {
        // If parsing fails, skip or handle as needed
        platformsArray = [];
      }
    } else if (Array.isArray(platforms)) {
      platformsArray = platforms;
    }

    // Handle the uploaded file (if any)
    let coverImagePath = "";
    if (req.file) {
      // We'll store the relative path in the images array
      coverImagePath = "uploads/" + req.file.filename;
    }

    // Create a new Product document
    const newBook = new Product({
      // Required fields
      name: title || "Untitled Book",
      price: price ? price.toString() : "0",
      short_description: shortDescription || "",
      sku: isbnNumber || "",  // We can store ISBN in the sku field
      author_name: author || "Unknown",
      
      // Category -> stored in the categories array
      categories: category
        ? [{ id: Date.now(), name: category }]
        : [],

      // Language -> stored in generic_name for demonstration
      generic_name: language || "Unknown",

      // The cover image
      images: coverImagePath
        ? [{ src: coverImagePath }]
        : [],

      // Optional subtitle -> you can store it in short_description or a custom field
      // We'll store it in short_description for demonstration
      // If you want it separate, add a new field to your model
      // short_description: shortDescription + (subtitle ? `\nSubtitle: ${subtitle}` : ""),

      // NEW FIELDS:
      bindingSize: bindingSizeArray,   // e.g. ["Paper Back", "Hard Cover"]
      platforms: platformsArray,       // e.g. [{ platform: "dreambook", royalty: 50 }, ...]

      // Mark the source as "custom" so we know it's user-created
      source: "custom"
    });

    // Save to MongoDB
    await newBook.save();

    // Respond with the newly created book
    return res.status(201).json({
      message: "Book created successfully",
      book: newBook,
    });
  } catch (error) {
    console.error("❌ Error creating book:", error);
    return res.status(500).json({ message: "Error creating book", error: error.message });
  }
});

// ------------------- LIST ALL CUSTOM BOOKS -------------------
router.get("/", async (req, res) => {
  try {
    // Fetch only books created with "source: custom"
    const books = await Product.find({ source: "custom" }).exec();
    return res.status(200).json(books);
  } catch (error) {
    console.error("❌ Error fetching books:", error);
    return res.status(500).json({ message: "Error fetching books", error: error.message });
  }
});

module.exports = router;
