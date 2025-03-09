import mongoose from 'mongoose';


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
