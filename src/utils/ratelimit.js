import rateLimit from 'express-rate-limit';

const ratelimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: '[429] Too many attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export default ratelimit;