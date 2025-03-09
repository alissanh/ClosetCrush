import mongoose from 'mongoose';


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/my-database';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Each user has arrays for tops, bottoms, shoes, accessories
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  tops: { type: [String], default: [] },
  bottoms: { type: [String], default: [] },
  shoes: { type: [String], default: [] },
  accessories: { type: [String], default: [] },
});


const User = mongoose.model('User', userSchema);

export default User;
