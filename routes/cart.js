const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// Middleware: require login
async function auth(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Please login first' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid session, please login' });
  }
}

// GET cart
router.get('/', auth, (req, res) => {
  res.json({ cart: req.user.cart });
});

// ADD / INCREMENT item
router.post('/add', auth, async (req, res) => {
  const { productId, name, price, image } = req.body;
  const user = req.user;
  const existing = user.cart.find(i => i.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    user.cart.push({ productId, name, price, image, quantity: 1 });
  }
  await user.save();
  res.json({ cart: user.cart });
});

// UPDATE quantity (set to 0 removes)
router.put('/update', auth, async (req, res) => {
  const { productId, quantity } = req.body;
  const user = req.user;
  if (quantity <= 0) {
    user.cart = user.cart.filter(i => i.productId !== productId);
  } else {
    const item = user.cart.find(i => i.productId === productId);
    if (item) item.quantity = quantity;
  }
  await user.save();
  res.json({ cart: user.cart });
});

// CLEAR cart
router.delete('/clear', auth, async (req, res) => {
  req.user.cart = [];
  await req.user.save();
  res.json({ cart: [] });
});

module.exports = router;
