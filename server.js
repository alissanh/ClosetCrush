import 'dotenv/config';  // Loads environment variables from .env
import express from 'express';
import Replicate from 'replicate';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Example model version for rembg from replicate.com
const REMBG_MODEL_VERSION =
  'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';

const categoryCount = {};

/**
 * Helper function to call replicate.rembg
 * and get back a ReadableStream of the processed PNG.
 */
async function removeBackground(imageUrl) {
  const stream = await replicate.run(REMBG_MODEL_VERSION, {
    input: { image: imageUrl },
  });
  return stream;
}

/**
 * POST /upload
 * Body: {
 *   "category": "top" | "bottom" | "shoes" | "accessories",
 *   "imageUrl": "https://..."
 * }
 *
 * Saves the background-removed image to disk as:
 *   <brand>_<category>_<count>.png
 */


app.post('/upload', async (req, res) => {
  try {
    const { category, imageUrl } = req.body;

    if (!category || !imageUrl) {
      return res.status(400).json({ error: 'Missing category or imageUrl' });
    }

    // Increment the item count for this category
    if (!categoryCount[category]) {
      categoryCount[category] = 0;
    }
    categoryCount[category] += 1;
    const itemNumber = categoryCount[category];

    // Parse the hostname from the URL
    const { hostname } = new URL(imageUrl);
    // Example: hostname might be "www.gapcanada.ca"
    // We'll split on "." and pick the second piece if there's a "www"
    const parts = hostname.split('.');
    let brand = parts[0];
    if (brand === 'www' && parts.length > 1) {
      brand = parts[1]; // e.g. "gapcanada"
    }

    // Perform the background removal
    const bgRemovedStream = await removeBackground(imageUrl);

    // Construct a filename like "gapcanada_top_1.png"
    const outputFilename = `${brand}_${category}_${itemNumber}.png`;
    const outputPath = path.join(__dirname, outputFilename);

    // Save the processed image stream to disk
    await pipeline(bgRemovedStream, fs.createWriteStream(outputPath));

    console.log(`Saved file for '${brand}' in category '${category}' -> ${outputFilename}`);

    return res.json({
      success: true,
      category,
      itemNumber,
      brand,
      filename: outputFilename,
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = 8080;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landingpage.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
