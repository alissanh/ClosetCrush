import dotenv from 'dotenv';
dotenv.config({ path: './main/.env' });
import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from './data.js';

// Add local storage database
const localDb = {
  users: {}
};

let useLocalStorage = true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if interface folder is in the current directory or one level up
let frontendPath = path.join(__dirname, 'interface');
if (!fs.existsSync(frontendPath)) {
  frontendPath = path.join(__dirname, '..', 'interface');
}

console.log('Server directory:', __dirname);
console.log('Frontend path:', frontendPath);
console.log('Frontend path exists:', fs.existsSync(frontendPath));

const app = express();
app.use(express.json());
app.use(cors());

// Log all requests
app.use((req, res, next) => {
  console.log(`Request for: ${req.url}`);
  next();
});

// Add middleware to log CSS file access
app.use((req, res, next) => {
  if (req.url.endsWith('.css')) {
    const cssPath = path.join(frontendPath, req.url.substring(1)); // Remove leading slash
    console.log(`CSS file requested: ${req.url}`);
    console.log(`Looking for CSS at: ${cssPath}`);
    console.log(`CSS file exists: ${fs.existsSync(cssPath)}`);
  }
  next();
});

// Set up static file serving
app.use(express.static(frontendPath));
console.log(`Serving static files from: ${frontendPath}`);

// Add specific routes for CSS files
app.get('/signinpage.css', (req, res) => {
  const cssPath = path.join(frontendPath, 'signinpage.css');
  console.log(`Serving signinpage.css from: ${cssPath}`);
  console.log(`File exists: ${fs.existsSync(cssPath)}`);
  
  if (fs.existsSync(cssPath)) {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(cssPath);
  } else {
    res.status(404).send('CSS file not found');
  }
});

app.get('/landingpage.css', (req, res) => {
  const cssPath = path.join(frontendPath, 'landingpage.css');
  console.log(`Serving landingpage.css from: ${cssPath}`);
  console.log(`File exists: ${fs.existsSync(cssPath)}`);
  
  if (fs.existsSync(cssPath)) {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(cssPath);
  } else {
    res.status(404).send('CSS file not found');
  }
});

console.log('MongoDB URI:', process.env.MONGODB_URI);

if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set!');
  console.error('Please check your .env file or set this environment variable.');
  process.exit(1); // Exit with error
}

// Only try to connect to MongoDB if not using local storage
if (!useLocalStorage) {
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  })
  .then(() => console.log('Connected to MongoDB!'))
  .catch((error) => {
    console.error('MongoDB connection error details:', error);
    console.log('Falling back to local storage mode');
    useLocalStorage = true;
  });
} else {
  console.log('Using local storage mode for development');
}

// Background removal function
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const REMBG_MODEL_VERSION =
  'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';

async function removeBackground(imageUrl) {
  try {
    const stream = await replicate.run(REMBG_MODEL_VERSION, { input: { image: imageUrl } });
    return stream;
  } catch (error) {
    console.error('Error removing background:', error);
    // Return a simple passthrough for local storage mode
    return imageUrl;
  }
}

app.post('/users/:id/addItem', async (req, res) => {
  try {
    const userId = req.params.id;
    const { category, imageUrl, name, brand, price } = req.body;

    if (!category || !imageUrl) {
      return res.status(400).json({ error: 'Missing category or imageUrl' });
    }

    // Parse the URL to get brand info
    const { hostname } = new URL(imageUrl);
    const urlParts = hostname.split('.');
    let derivedBrand = urlParts[0];
    if (derivedBrand === 'www' && urlParts.length > 1) derivedBrand = urlParts[1];

    const timestamp = Date.now();
    const outputFilename = `${derivedBrand}_${category}_${timestamp}.png`;

    // Create images directory if it doesn't exist
    const imagesDir = path.join(frontendPath, 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    // Use the background removal API regardless of storage mode
    const outputPath = path.join(imagesDir, outputFilename);
    try {
      const bgRemovedStream = await removeBackground(imageUrl);
      await pipeline(bgRemovedStream, fs.createWriteStream(outputPath));
      console.log(`Background removed and saved to ${outputFilename}`);
    } catch (error) {
      console.error('Error removing background:', error);
      return res.status(500).json({ error: 'Failed to process image' });
    }

    // For local storage mode
    if (useLocalStorage) {
      // Find user in local storage
      let userData = null;
      let userEmail = null;
      
      for (const email in localDb.users) {
        if (localDb.users[email]._id === userId) {
          userData = localDb.users[email];
          userEmail = email;
          break;
        }
      }
      
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Add item to user's collection
      const newItem = {
        filename: outputFilename,
        name: name || '',
        brand: brand || derivedBrand,
        price: price || '',
        addedAt: new Date(),
        _id: Date.now().toString() // Add a unique ID for local storage items
      };
      
      if (!userData[category]) {
        userData[category] = [];
      }
      
      userData[category].push(newItem);
      
      console.log(`Added item to ${category} for user ${userEmail}`);
      
      return res.json({
        success: true,
        category,
        item: newItem
      });
    }

    // MongoDB mode - only executed if useLocalStorage is false
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Create new item object with all details
    const newItem = {
      filename: outputFilename,
      name: name || '',
      brand: brand || derivedBrand,
      price: price || '',
      addedAt: new Date()
    };

    // Add item to the appropriate category
    user[category].push(newItem);
    await user.save();

    console.log(`Saved item "${name}" from '${brand || derivedBrand}' in category '${category}'`);

    return res.json({
      success: true,
      category,
      item: newItem
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/users/:id/items', async (req, res) => {
  try {
    if (useLocalStorage) {
      // Find user by ID in local storage
      let userData = null;
      
      for (const email in localDb.users) {
        if (localDb.users[email]._id === req.params.id) {
          userData = localDb.users[email];
          break;
        }
      }
      
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.json({
        tops: userData.tops || [],
        bottoms: userData.bottoms || [],
        shoes: userData.shoes || [],
        accessories: userData.accessories || [],
        dresses: userData.dresses || []
      });
    }
    
    // If MongoDB is available
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      tops: user.tops || [],
      bottoms: user.bottoms || [],
      shoes: user.shoes || [],
      accessories: user.accessories || [],
      dresses: user.dresses || []
    });
  } catch (error) {
    console.error('Error getting items:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/users/findOrCreate', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Use local storage if enabled
    if (useLocalStorage) {
      console.log(`Using local storage mode for user: ${email}`);
      
      // Check if user exists in local storage
      if (!localDb.users[email]) {
        // Create new user
        localDb.users[email] = {
          _id: Date.now().toString(),
          email,
          tops: [],
          bottoms: [],
          shoes: [],
          accessories: [],
          dresses: [],
          outfits: [],
          crushes: []
        };
        console.log(`Created local user: ${email} with ID ${localDb.users[email]._id}`);
      } else {
        console.log(`Found existing local user: ${email}`);
      }
      
      return res.json({
        success: true,
        user: {
          _id: localDb.users[email]._id,
          email: localDb.users[email].email
        }
      });
    }
    
    // If MongoDB is available, use it as before
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({ email });
      await user.save();
    }
    
    return res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error finding/creating user:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Set the root route to serve signinpage.html
app.get('/', (req, res) => {
  const signinPath = path.join(frontendPath, 'signinpage.html');
  console.log('Serving signin page from:', signinPath);
  console.log('Signin page exists:', fs.existsSync(signinPath));
  
  if (fs.existsSync(signinPath)) {
    res.sendFile(signinPath);
  } else {
    res.status(404).send('Signin page not found. Check server logs for details.');
  }
});

// Explicit signin route
app.get('/signin', (req, res) => {
  const signinPath = path.join(frontendPath, 'signinpage.html');
  if (fs.existsSync(signinPath)) {
    res.sendFile(signinPath);
  } else {
    res.redirect('/');
  }
});

// Landing page route
app.get('/landing', (req, res) => {
  const landingPath = path.join(frontendPath, 'landingpage.html');
  console.log('Serving landing page from:', landingPath);
  console.log('Landing page exists:', fs.existsSync(landingPath));
  
  if (fs.existsSync(landingPath)) {
    res.sendFile(landingPath);
  } else {
    res.status(404).send('Landing page not found. Check server logs for details.');
  }
});

app.get('/wishlist.css', (req, res) => {
  const cssPath = path.join(frontendPath, 'wishlist.css');
  console.log(`Serving wishlist.css from: ${cssPath}`);
  console.log(`File exists: ${fs.existsSync(cssPath)}`);
  
  if (fs.existsSync(cssPath)) {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(cssPath);
  } else {
    res.status(404).send('CSS file not found');
  }
});

// Serve image files with specific logging
app.get('/images/:imageName', (req, res) => {
  const imagePath = path.join(frontendPath, 'images', req.params.imageName);
  console.log(`Serving image from: ${imagePath}`);
  console.log(`Image exists: ${fs.existsSync(imagePath)}`);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).send('Image not found');
  }
});

app.post('/users/:id/deleteItem', async (req, res) => {
  try {
    const userId = req.params.id;
    const { category, itemId } = req.body;

    if (!category || !itemId) {
      return res.status(400).json({ error: 'Missing category or itemId' });
    }

    // Handle local storage mode
    if (useLocalStorage) {
      // Find user in local storage
      let userData = null;
      
      for (const email in localDb.users) {
        if (localDb.users[email]._id === userId) {
          userData = localDb.users[email];
          break;
        }
      }
      
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Find and remove the item
      if (!userData[category] || !Array.isArray(userData[category])) {
        return res.status(404).json({ error: 'Category not found for user' });
      }
      
      const itemIndex = userData[category].findIndex(item => item._id === itemId || item.filename === itemId);
      
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found in user\'s collection' });
      }
      
      // Get the filename before removing
      const filename = userData[category][itemIndex].filename;
      
      // Remove the item
      userData[category].splice(itemIndex, 1);
      
      // Remove file if it exists
      const imagePath = path.join(frontendPath, 'images', filename);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
      
      return res.json({
        success: true,
        message: `Item removed from ${category}`
      });
    }

    // MongoDB mode
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Find the item by its ID
    const itemIndex = user[category].findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in user\'s collection' });
    }
    
    // Get filename before removing
    const filename = user[category][itemIndex].filename;
    
    // Remove the item from the array
    user[category].splice(itemIndex, 1);
    await user.save();
    
    // Optionally delete the file from the filesystem
    const imagePath = path.join(frontendPath, 'images', filename);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    return res.json({
      success: true,
      message: `Item removed from ${category}`
    });

  } catch (error) {
    console.error('Error deleting item:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Save an outfit
app.post('/users/:id/saveOutfit', async (req, res) => {
  try {
    const userId = req.params.id;
    const { outfit, date } = req.body;

    // Handle local storage mode
    if (useLocalStorage) {
      // Find user in local storage
      let userData = null;
      
      for (const email in localDb.users) {
        if (localDb.users[email]._id === userId) {
          userData = localDb.users[email];
          break;
        }
      }
      
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Initialize outfits array if needed
      if (!userData.outfits) {
        userData.outfits = [];
      }
      
      // Add the outfit
      userData.outfits.push({
        tops: outfit.tops,
        bottoms: outfit.bottoms,
        dresses: outfit.dresses,
        shoes: outfit.shoes,
        accessories: outfit.accessories,
        date: date || new Date(),
        _id: Date.now().toString()
      });
      
      return res.json({
        success: true,
        message: 'Outfit saved successfully'
      });
    }

    // MongoDB mode
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Initialize outfits array if it doesn't exist
    if (!user.outfits) {
      user.outfits = [];
    }

    // Add the outfit
    user.outfits.push({
      tops: outfit.tops,
      bottoms: outfit.bottoms,
      dresses: outfit.dresses,
      shoes: outfit.shoes,
      accessories: outfit.accessories,
      date: date || new Date()
    });

    await user.save();

    return res.json({
      success: true,
      message: 'Outfit saved successfully'
    });

  } catch (error) {
    console.error('Error saving outfit:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Add an outfit to crushes (favorites)
app.post('/users/:id/crushOutfit', async (req, res) => {
  try {
    const userId = req.params.id;
    const { outfit, date } = req.body;

    // Handle local storage mode
    if (useLocalStorage) {
      // Find user in local storage
      let userData = null;
      
      for (const email in localDb.users) {
        if (localDb.users[email]._id === userId) {
          userData = localDb.users[email];
          break;
        }
      }
      
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Initialize crushes array if needed
      if (!userData.crushes) {
        userData.crushes = [];
      }
      
      // Add the outfit to crushes
      userData.crushes.push({
        tops: outfit.tops,
        bottoms: outfit.bottoms,
        dresses: outfit.dresses,
        shoes: outfit.shoes,
        accessories: outfit.accessories,
        date: date || new Date(),
        _id: Date.now().toString()
      });
      
      return res.json({
        success: true,
        message: 'Outfit added to crushes'
      });
    }

    // MongoDB mode
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Initialize crushes array if it doesn't exist
    if (!user.crushes) {
      user.crushes = [];
    }

    // Add the outfit to crushes
    user.crushes.push({
      tops: outfit.tops,
      bottoms: outfit.bottoms,
      dresses: outfit.dresses,
      shoes: outfit.shoes,
      accessories: outfit.accessories,
      date: date || new Date()
    });

    await user.save();

    return res.json({
      success: true,
      message: 'Outfit added to crushes'
    });

  } catch (error) {
    console.error('Error adding outfit to crushes:', error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});