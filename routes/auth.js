const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = sign(user._id);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ message: 'Registered!', user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error('REGISTER ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = sign(user._id);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ message: 'Logged in!', user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// WHO AM I
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.json({ user: null });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select('-password');
    res.json({ user: user ? { name: user.name, email: user.email } : null });
  } catch {
    res.json({ user: null });
  }
});

module.exports = router;
