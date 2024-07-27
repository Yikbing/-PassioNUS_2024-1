const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Module = require('../models/modules');
const collection = require('../models/config');
const { studentModel: Student } = require('../models/Student'); // Import your Student model

// Function to remove duplicate modules by name
function removeDuplicateModules(modules) {
  const uniqueModules = [];
  const moduleNames = new Set();

  modules.forEach(mod => {
    if (!moduleNames.has(mod.name)) {
      moduleNames.add(mod.name);
      uniqueModules.push(mod);
    }
  });

  return uniqueModules;
}

// Route to handle module data submission
router.post('/', async (req, res) => {
  let { userId, modules } = req.body;

  // Remove duplicates from the modules array
  modules = removeDuplicateModules(modules);

  try {
    // Find or create a new entry
    const updatedModuleEntry = await Module.findOneAndUpdate(
      { userId }, // Query to find the document by userId
      { $set: { modules } }, // Update the modules field
      { upsert: true, new: true } // Create a new document if none exists, and return the updated document
    );

    // Find users with similar modules
    const allModules = await Module.find({}).exec();

    let highestScore = 0;
    let bestMatches = [];

    for (const moduleEntry of allModules) {
      if (moduleEntry.userId.toString() !== userId.toString()) { // Ensure userId is compared correctly
        const { score, common } = calculateSimilarityScore(modules, moduleEntry.modules);

        if (score > highestScore) {
          highestScore = score;
          bestMatches = [{ moduleEntry, common }]; // Start a new list of best matches
        } else if (score === highestScore) {
          bestMatches.push({ moduleEntry, common }); // Add to the existing list of best matches
        }
      }
    }

    // If any best matches are found, select one at random
    if (bestMatches.length > 0) {
      const randomIndex = Math.floor(Math.random() * bestMatches.length);
      const bestMatch = bestMatches[randomIndex];

      // Retrieve additional information
      const matchedUser = await collection.findOne({ userId: bestMatch.moduleEntry.userId }).exec();
      const matchedStudent = await Student.findOne({ _id: bestMatch.moduleEntry.userId }).select('nickname').exec(); // Fetch the nickname

      if (matchedUser && matchedStudent) {
        res.json({
          match: {
            userId: matchedUser.userId, // Include userId in the match object
            name: matchedUser.name,
            faculty: matchedUser.faculty,
            yearOfStudy: matchedUser.year,
            nickname: matchedStudent.nickname // Include nickname in the match object
          },
          commonModules: bestMatch.common // Send the common modules
        });
      } else {
        res.json({ match: null });
      }
    } else {
      res.json({ match: null });
    }
  } catch (error) {
    console.error('Error handling study buddy request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function calculateSimilarityScore(modules1, modules2) {
  // Use a set to remove duplicates and ensure unique module names
  const moduleNames1 = new Set(modules1.map(mod => mod.name));
  const moduleNames2 = new Set(modules2.map(mod => mod.name));
  const common = [];

  let score = 0;
  moduleNames1.forEach(name1 => {
    if (moduleNames2.has(name1)) {
      score++;
      common.push(name1); // Collect the common modules
    }
  });

  return { score, common };
}

module.exports = router;
