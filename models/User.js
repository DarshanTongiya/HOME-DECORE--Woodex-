const mongoose = require('mongoose');
const { scryptSync, randomBytes, timingSafeEqual } = require('crypto');

// ─── Helpers (Node built-in crypto – no extra package needed) ─────────────
function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const key  = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${key}`;
}

function verifyPassword(plain, stored) {
  const [salt, storedKey] = stored.split(':');
  const key = scryptSync(plain, salt, 64);
  return timingSafeEqual(Buffer.from(storedKey, 'hex'), key);
}

// ─── Schemas ──────────────────────────────────────────────────────────────
const cartItemSchema = new mongoose.Schema({
  productId: String,
  name:      String,
  price:     Number,
  image:     String,
  quantity:  { type: Number, default: 1 }
});

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  cart:     [cartItemSchema]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', function () {
  if (!this.isModified('password')) return;
  this.password = hashPassword(this.password);
});

// Compare plain password against stored hash
userSchema.methods.comparePassword = function (plain) {
  return verifyPassword(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);