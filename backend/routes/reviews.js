const express = require('express');
const customerAuth = require('../middleware/customerAuth');
const Review = require('../models/Review');
const Event = require('../models/Event');        // بدلاً من Salon
const Ticket = require('../models/Ticket');      // للتحقق من شراء التذكرة
const Customer = require('../models/Customer');
const router = express.Router();

// إضافة تقييم لفعالية (يحتاج العميل إلى تذكرة مشتراة لهذه الفعالية)
router.post('/', customerAuth, async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;
    const customer = await Customer.findById(req.customerId);
    if (!customer) return res.status(404).json({ message: 'عميل غير موجود' });

    // التحقق من وجود تذكرة مؤكدة أو مستخدمة لهذه الفعالية
    const ticket = await Ticket.findOne({
      eventId,
      customerId: req.customerId,
      status: { $in: ['confirmed', 'used'] }
    });
    if (!ticket) {
      return res.status(403).json({ message: 'لا يمكنك تقييم هذه الفعالية دون شراء تذكرة' });
    }

    const review = new Review({
      eventId,
      customerId: req.customerId,
      customerName: customer.name,
      rating,
      comment
    });
    await review.save();

    // تحديث متوسط التقييمات للفعالية
    const reviews = await Review.find({ eventId });
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await Event.findByIdAndUpdate(eventId, {
      rating: Math.round(avg * 10) / 10,
      totalReviews: reviews.length
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// جلب تقييمات فعالية معينة
router.get('/event/:eventId', async (req, res) => {
  const reviews = await Review.find({ eventId: req.params.eventId }).sort({ createdAt: -1 });
  res.json(reviews);
});

module.exports = router;