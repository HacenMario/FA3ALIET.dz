const express = require('express');
const auth = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Customer = require('../models/Customer');
const { addNotification } = require('./notifications');
const router = express.Router();

// ✅ جلب تذاكر المنظم
router.get('/', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ eventId: req.eventId }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ جلب تذاكر العميل المسجل
router.get('/my', customerAuth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ customerId: req.customerId })
      .populate('eventId', 'name venue startDate coverImage')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ جلب تذاكر العميل برقم الهاتف
router.get('/customer/:phone', async (req, res) => {
  try {
    const tickets = await Ticket.find({ customerPhone: req.params.phone })
      .populate('eventId', 'name venue startDate coverImage')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ شراء تذكرة (للعميل)
router.post('/purchase', async (req, res) => {
  try {
    const { eventId, ticketTier, quantity, customerName, customerPhone, customerEmail, customerId, paymentMethod } = req.body;
    
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'الفعالية غير موجودة' });
    
    const tier = event.ticketTiers.find(t => t.name === ticketTier);
    if (!tier) return res.status(404).json({ message: 'هذه الفئة غير موجودة' });
    if (tier.remaining < quantity) return res.status(409).json({ message: 'عدد التذاكر المتبقية غير كافٍ' });
    
    // تحديث العدد المتبقي
    tier.remaining -= quantity;
    event.soldTickets += quantity;
    await event.save();
    
    // إضافة نقاط للعميل
    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, { $inc: { points: quantity * 10 } });
    }
    
    const totalPrice = tier.price * quantity;
    const ticket = new Ticket({
      eventId,
      customerId: customerId || null,
      customerName,
      customerPhone,
      customerEmail,
      ticketTier,
      price: tier.price,
      quantity,
      totalPrice,
      paymentMethod,
      status: paymentMethod === 'cash' ? 'pending' : 'confirmed',
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid'
    });
    await ticket.save();
    
    // إشعار للمنظم
    await addNotification(eventId, 'event', '🎟️ تذكرة جديدة', `تم شراء ${quantity} تذكرة (${ticketTier}) من قبل ${customerName}`);
    
    // إشعار للعميل (إذا كان مسجلاً)
    if (customerId) {
      await addNotification(customerId, 'customer', '✅ تم شراء التذكرة', `تم شراء ${quantity} تذكرة لـ ${event.name} في ${event.startDate}`);
    }
    
    // إشعار واتساب
    console.log(`💬 رابط العميل: https://wa.me/213${customerPhone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`مرحباً ${customerName}، تم شراء ${quantity} تذكرة (${ticketTier}) لفعالية ${event.name}. السعر الإجمالي: ${totalPrice} دج.`)}`);
    
    res.status(201).json({ message: 'تم شراء التذكرة بنجاح', ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ إلغاء التذكرة (للعميل)
router.put('/:id/cancel', customerAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, customerId: req.customerId });
    if (!ticket) return res.status(404).json({ message: 'غير موجود' });
    if (ticket.status === 'cancelled') return res.status(400).json({ message: 'التذكرة ملغية بالفعل' });
    
    ticket.status = 'cancelled';
    await ticket.save();
    
    // إعادة الكمية إلى الفعالية
    const event = await Event.findById(ticket.eventId);
    if (event) {
      const tier = event.ticketTiers.find(t => t.name === ticket.ticketTier);
      if (tier) {
        tier.remaining += ticket.quantity;
        event.soldTickets -= ticket.quantity;
        await event.save();
      }
    }
    
    await addNotification(ticket.eventId, 'event', '❌ إلغاء تذكرة', `تم إلغاء ${ticket.quantity} تذكرة من قبل ${ticket.customerName}`);
    res.json({ message: 'تم الإلغاء' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ استخدام التذكرة (دخول الفعالية) - للمنظم
router.put('/:id/use', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, eventId: req.eventId });
    if (!ticket) return res.status(404).json({ message: 'غير موجود' });
    if (ticket.status !== 'confirmed') return res.status(400).json({ message: 'التذكرة غير صالحة' });
    
    ticket.status = 'used';
    ticket.usedAt = new Date();
    await ticket.save();
    res.json({ message: 'تم استخدام التذكرة' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
