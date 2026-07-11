const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['concert', 'conference', 'workshop', 'festival', 'sports', 'art', 'theatre', 'comedy', 'other'], 
    required: true 
  },
  venue: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  organizer: { type: String, required: true },
  organizerPhone: { type: String, required: true },
  organizerEmail: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  logo: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  gallery: [String],
  ticketTiers: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    remaining: { type: Number, default: 0 },
    description: String
  }],
  totalTickets: { type: Number, default: 0 },
  soldTickets: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], 
    default: 'upcoming' 
  },
  featured: { type: Boolean, default: false },
  lat: Number,
  lng: Number,
  tags: [String],
  facebook: String,
  instagram: String,
  twitter: String,
  website: String
}, { timestamps: true });

EventSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

EventSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Event', EventSchema);