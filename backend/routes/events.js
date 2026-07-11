const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const router = express.Router();

// ✅ جلب جميع الفعاليات (عام)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().select('-password').sort({ startDate: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ جلب فعالية معينة
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('-password');
    if (!event) return res.status(404).json({ message: 'الفعالية غير موجودة' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ تسجيل منظم جديد (إنشاء فعالية)
router.post('/register', async (req, res) => {
  try {
    const { name, description, category, venue, city, address, startDate, endDate, startTime, endTime, organizer, organizerPhone, organizerEmail, password, logo, coverImage, gallery, ticketTiers, tags, facebook, instagram, twitter, website, lat, lng } = req.body;
    
    const existing = await Event.findOne({ organizerEmail });
    if (existing) return res.status(400).json({ message: 'هذا البريد مستخدم من قبل' });
    
    const totalTickets = ticketTiers.reduce((sum, tier) => sum + tier.quantity, 0);
    const event = new Event({
      name, description, category, venue, city, address, startDate, endDate, startTime, endTime,
      organizer, organizerPhone, organizerEmail, password, logo, coverImage, gallery,
      ticketTiers: ticketTiers.map(t => ({ ...t, remaining: t.quantity })),
      totalTickets,
      tags, facebook, instagram, twitter, website, lat, lng
    });
    await event.save();
    
    const token = jwt.sign({ id: event._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, eventId: event._id, name: event.name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ تسجيل دخول المنظم
router.post('/login', async (req, res) => {
  try {
    const { organizerEmail, password } = req.body;
    const event = await Event.findOne({ organizerEmail });
    if (!event) return res.status(400).json({ message: 'بيانات غير صحيحة' });
    const isMatch = await event.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: 'بيانات غير صحيحة' });
    const token = jwt.sign({ id: event._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, eventId: event._id, name: event.name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ تحديث الفعالية (للمنظم)
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'غير موجود' });
    if (event._id.toString() !== req.eventId) return res.status(403).json({ message: 'غير مصرح' });
    Object.assign(event, req.body);
    await event.save();
    res.json({ message: 'تم التحديث', event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ تحديث التذاكر (للمنظم)
router.put('/:id/tickets', auth, async (req, res) => {
  try {
    const { ticketTiers } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'غير موجود' });
    if (event._id.toString() !== req.eventId) return res.status(403).json({ message: 'غير مصرح' });
    event.ticketTiers = ticketTiers;
    event.totalTickets = ticketTiers.reduce((sum, t) => sum + t.quantity, 0);
    await event.save();
    res.json({ message: 'تم التحديث', ticketTiers: event.ticketTiers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ حذف الفعالية
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'غير موجود' });
    if (event._id.toString() !== req.eventId) return res.status(403).json({ message: 'غير مصرح' });
    await Ticket.deleteMany({ eventId: event._id });
    await Review.deleteMany({ eventId: event._id });
    await Notification.deleteMany({ userId: event._id, userType: 'event' });
    await event.deleteOne();
    res.json({ message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;