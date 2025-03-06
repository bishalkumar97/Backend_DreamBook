// routes/authors.js
const express = require("express");
const bcrypt = require("bcrypt");
const Author = require("../models/Author");

const router = express.Router();

// ------------------- CREATE A NEW AUTHOR -------------------
router.post("/", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validate fields
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Check if the email is already in use
    const existingAuthor = await Author.findOne({ email });
    if (existingAuthor) {
      return res.status(400).json({ message: "Email already in use." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new author document
    const newAuthor = new Author({
      name,
      email,
      password: hashedPassword
    });

    await newAuthor.save();

    // Return a response without the hashed password
    return res.status(201).json({
      message: "Author created successfully",
      author: {
        _id: newAuthor._id,
        name: newAuthor.name,
        email: newAuthor.email
      }
    });
  } catch (error) {
    console.error("❌ Error creating author:", error);
    return res.status(500).json({ message: "Error creating author", error: error.message });
  }
});

// ------------------- LIST ALL AUTHORS -------------------
router.get("/", async (req, res) => {
  try {
    // Exclude the password field
    const authors = await Author.find().select("-password");
    return res.status(200).json(authors);
  } catch (error) {
    console.error("❌ Error fetching authors:", error);
    return res.status(500).json({ message: "Error fetching authors", error: error.message });
  }
});

module.exports = router;
