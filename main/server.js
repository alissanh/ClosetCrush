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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '..', 'interface');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(frontendPath));

console.log('MongoDB URI:', process.env.MONGODB_URI);

if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set!');
  console.error('Please check your .env file or set this environment variable.');
  process.exit(1); // Exit with error
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch((error) => console.error('MongoDB connection error:', error));


const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const REMBG_MODEL_VERSION =
  'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';

async function removeBackground(imageUrl) {
  const stream = await replicate.run(REMBG_MODEL_VERSION, { input: { image: imageUrl } });
  return stream;
}

app.post('/users/:id/addItem', async (req, res) => {
  try {
    const userId = req.params.id;
    const { category, imageUrl } = req.body;

    if (!category || !imageUrl) {
      return res.status(400).json({ error: 'Missing category or imageUrl' });
    }

    const { hostname } = new URL(imageUrl);
    const parts = hostname.split('.');
    let brand = parts[0];
    if (brand === 'www' && parts.length > 1) brand = parts[1];

    const timestamp = Date.now();
    const outputFilename = `${brand}_${category}_${timestamp}.png`;

    const imagesDir = path.join(frontendPath, 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    const outputPath = path.join(imagesDir, outputFilename);
    const bgRemovedStream = await removeBackground(imageUrl);
    await pipeline(bgRemovedStream, fs.createWriteStream(outputPath));

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user[category].push(outputFilename);
    await user.save();

    console.log(`Saved file for '${brand}' in category '${category}' -> ${outputFilename}`);

    return res.json({
      success: true,
      category,
      brand,
      filename: outputFilename,
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/users/:id/items', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      tops: user.tops,
      bottoms: user.bottoms,
      shoes: user.shoes,
      accessories: user.accessories,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
