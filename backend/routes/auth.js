const express = require('express');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const auth = require('../middleware/auth');
const router = express.Router();

// تسجيل منظم جديد (إنشاء فعالية)
router.post('/register', async (req, res) => {
  try {
    const {
      name, description, category, venue, city, address,
      startDate, endDate, startTime, endTime,
      organizer, organizerPhone, organizerEmail, password,
      logo, coverImage, gallery, ticketTiers,
      tags, facebook, instagram, twitter, website, lat, lng
    } = req.body;

    const existing = await Event.findOne({ organizerEmail });
    if (existing) return res.status(400).json({ message: 'البريد مستخدم بالفعل' });

    const totalTickets = ticketTiers.reduce((sum, t) => sum + t.quantity, 0);
    const event = new Event({
      name, description, category, venue, city, address,
      startDate, endDate, startTime, endTime,
      organizer, organizerPhone, organizerEmail, password,
      logo, coverImage, gallery,
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

// دخول المنظم
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

// تغيير كلمة المرور (للمنظم)
router.put('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const event = await Event.findById(req.eventId);
    if (!event) return res.status(404).json({ message: 'غير موجود' });
    if (!(await event.matchPassword(oldPassword))) {
      return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }
    event.password = newPassword;
    await event.save();
    res.json({ message: '✅ تم تغيير كلمة المرور' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;