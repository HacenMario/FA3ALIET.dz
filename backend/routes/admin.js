const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const Event = require('../models/Event');
const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');      // بدلاً من Appointment
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const router = express.Router();

// ===================== إحصائيات عامة =====================
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    const totalTickets = await Ticket.countDocuments();
    const totalRevenue = await Ticket.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const pendingTickets = await Ticket.countDocuments({ paymentStatus: 'pending' });
    const totalReviews = await Review.countDocuments();

    res.json({
      totalEvents,
      totalCustomers,
      totalTickets,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingTickets,
      totalReviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===================== إدارة الفعاليات =====================
router.get('/events', adminAuth, async (req, res) => {
  const events = await Event.find().select('-password');
  res.json(events);
});

router.get('/events/:id', adminAuth, async (req, res) => {
  const event = await Event.findById(req.params.id).select('-password');
  if (!event) return res.status(404).json({ message: 'غير موجود' });
  res.json(event);
});

router.put('/events/:id', adminAuth, async (req, res) => {
  const { name, city, address, phone, email } = req.body;
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: 'غير موجود' });

  if (name) event.name = name;
  if (city) event.city = city;
  if (address) event.address = address;
  if (phone) event.organizerPhone = phone;
  if (email) event.organizerEmail = email;

  await event.save();
  res.json({ message: '✅ تم التحديث', event });
});

router.delete('/events/:id', adminAuth, async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: 'غير موجود' });

  await Ticket.deleteMany({ eventId: event._id });
  await Review.deleteMany({ eventId: event._id });
  await Notification.deleteMany({ userId: event._id, userType: 'event' });

  await event.deleteOne();
  res.json({ message: 'تم الحذف' });
});

// ===================== إدارة العملاء =====================
router.get('/customers', adminAuth, async (req, res) => {
  const customers = await Customer.find().select('-password');
  res.json(customers);
});

router.get('/customers/:id', adminAuth, async (req, res) => {
  const customer = await Customer.findById(req.params.id).select('-password');
  if (!customer) return res.status(404).json({ message: 'غير موجود' });
  res.json(customer);
});

router.put('/customers/:id', adminAuth, async (req, res) => {
  const { name, email, phone } = req.body;
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'غير موجود' });

  if (name) customer.name = name;
  if (email) customer.email = email;
  if (phone) customer.phone = phone;

  await customer.save();
  res.json({ message: '✅ تم التحديث', customer });
});

router.delete('/customers/:id', adminAuth, async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'غير موجود' });

  await Ticket.deleteMany({ customerId: customer._id });
  await Review.deleteMany({ customerId: customer._id });
  await Notification.deleteMany({ userId: customer._id, userType: 'customer' });

  await customer.deleteOne();
  res.json({ message: 'تم الحذف' });
});

// ===================== إدارة التقييمات =====================
router.get('/reviews', adminAuth, async (req, res) => {
  const reviews = await Review.find()
    .populate('eventId', 'name')
    .populate('customerId', 'name');
  res.json(reviews);
});

router.delete('/reviews/:id', adminAuth, async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'غير موجود' });

  await review.deleteOne();

  const event = await Event.findById(review.eventId);
  if (event) {
    const reviews = await Review.find({ eventId: event._id });
    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
    event.rating = Math.round(avg * 10) / 10;
    event.totalReviews = reviews.length;
    await event.save();
  }
  res.json({ message: 'تم الحذف' });
});

// ===================== إدارة التذاكر =====================
router.get('/tickets', adminAuth, async (req, res) => {
  const tickets = await Ticket.find()
    .populate('eventId', 'name')
    .populate('customerId', 'name');
  res.json(tickets);
});

module.exports = router;