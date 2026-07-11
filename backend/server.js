const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// تحميل متغيرات البيئة
dotenv.config();

const app = express();
const server = http.createServer(app);

// إعداد Socket.io للإشعارات الفورية
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ============================================================
// Socket.io - إشعارات فورية
// ============================================================
io.on('connection', (socket) => {
  console.log('🔌 عميل متصل:', socket.id);

  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
    console.log(`📌 حدث ${eventId} انضم`);
  });

  socket.on('join-customer', (customerId) => {
    socket.join(`customer-${customerId}`);
    console.log(`📌 عميل ${customerId} انضم`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 عميل disconnected:', socket.id);
  });
});

// جعل io متاحاً في المسارات
app.set('io', io);

// ============================================================
// مسار ترحيبي
// ============================================================
app.get('/', (req, res) => {
  res.send('🚀 مرحباً بك في API فعاليات حلقتي!');
});

// ============================================================
// المسارات (Routes)
// ============================================================

// مصادقة المنظم (تسجيل/دخول الفعاليات)
app.use('/api/auth', require('./routes/auth'));

// مصادقة العميل
app.use('/api/customer/auth', require('./routes/customerAuth'));

// مصادقة المدير
app.use('/api/admin/auth', require('./routes/adminAuth'));

// لوحة تحكم المدير
app.use('/api/admin', require('./routes/admin'));

// الفعاليات (عرض، إنشاء، تحديث، حذف)
app.use('/api/events', require('./routes/events'));

// التذاكر (شراء، إلغاء، استخدام، عرض)
app.use('/api/tickets', require('./routes/tickets'));

// التقييمات
app.use('/api/reviews', require('./routes/reviews'));

// الإشعارات
app.use('/api/notifications', require('./routes/notifications').router);

// ============================================================
// الاتصال بقاعدة البيانات
// ============================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    console.log(`📦 قاعدة البيانات: ${mongoose.connection.db.databaseName}`);
  })
  .catch(err => {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err);
    process.exit(1);
  });

// ============================================================
// تشغيل الخادم
// ============================================================
const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
  console.log(`📡 Socket.io جاهز للإشعارات الفورية`);
});
