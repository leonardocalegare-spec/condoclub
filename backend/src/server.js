require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const condoRoutes = require('./routes/condoRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const orderRoutes = require('./routes/orderRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de requisições atingido. Tente novamente em breve.' },
  skip: () => process.env.NODE_ENV === 'test',
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/condos', apiLimiter, condoRoutes);
app.use('/api/suppliers', apiLimiter, supplierRoutes);
app.use('/api/services', apiLimiter, serviceRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CondoClub API running on port ${PORT}`);
  });
}

module.exports = app;
