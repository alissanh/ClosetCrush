// data.js
import mongoose from 'mongoose';

// Define individual item schema
const itemSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  name: { type: String, default: '' },
  brand: { type: String, default: '' },
  price: { type: String, default: '' },
  addedAt: { type: Date, default: Date.now }
});

// Update user schema to store detailed item info
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  tops: { type: [itemSchema], default: [] },
  bottoms: { type: [itemSchema], default: [] },
  shoes: { type: [itemSchema], default: [] },
  accessories: { type: [itemSchema], default: [] },
});

const User = mongoose.model('User', userSchema);

export default User;