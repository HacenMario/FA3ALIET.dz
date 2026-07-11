const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String, required: true },
  ticketTier: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  totalPrice: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'used'], 
    default: 'pending' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'online'], 
    default: 'cash' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed'], 
    default: 'pending' 
  },
  qrCode: { type: String, default: '' },
  notes: String,
  usedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
