import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  name: { type: String, default: '' },
  brand: { type: String, default: '' },
  price: { type: String, default: '' },
  addedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  tops: { type: [itemSchema], default: [] },
  bottoms: { type: [itemSchema], default: [] },
  dresses: { type: [itemSchema], default: [] },
  shoes: { type: [itemSchema], default: [] },
  accessories: { type: [itemSchema], default: [] },
  outfits: { type: Array, default: [] },
  crushes: { type: Array, default: [] }
});

const User = mongoose.model('User', userSchema);

export default User;