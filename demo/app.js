// Dialog Demo App — Express e-commerce with intentional bugs
import express from 'express';
import morgan from 'morgan';

const app = express();
app.use(express.json());
app.use(morgan('combined'));

// Simulated products
const products = [
  { id: 1, name: 'Widget Pro', price: 29.99 },
  { id: 2, name: 'Gadget Max', price: 49.99 },
  { id: 3, name: 'Doohickey', price: 19.99 },
];

// Simulated cart
const carts = new Map();

// Middleware: extract user from JWT (simplified)
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      // Simplified JWT decode (base64 payload)
      const payload = authHeader.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      req.userId = decoded.sub || decoded.userId;
      req.sessionId = decoded.sessionId;
    } catch {
      // No valid token
    }
  }
  // Also check header
  req.userId = req.userId || req.headers['x-user-id'];
  next();
});

// GET /products — works fine
app.get('/products', (req, res) => {
  console.log(`[INFO] Listing products for user=${req.userId || 'anonymous'}`);
  res.json({ products });
});

// POST /cart/add — works fine
app.post('/cart/add', (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.userId || 'anonymous';
  console.log(`[INFO] user_id=${userId} Adding product ${productId} qty=${quantity} to cart`);

  const cart = carts.get(userId) || [];
  cart.push({ productId, quantity: quantity || 1 });
  carts.set(userId, cart);

  res.json({ success: true, cart });
});

// POST /checkout — 500 error (Stripe timeout bug)
app.post('/checkout', async (req, res) => {
  const userId = req.userId || 'anonymous';
  console.log(`[INFO] user_id=${userId} Starting checkout`);

  const cart = carts.get(userId);
  if (!cart || cart.length === 0) {
    console.log(`[WARN] user_id=${userId} Empty cart at checkout`);
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Simulate Stripe timeout (intermittent)
  if (Math.random() < 0.6) {
    console.error(`[ERROR] user_id=${userId} Stripe API timeout after 30000ms — POST https://api.stripe.com/v1/charges`);
    console.error(`[ERROR] Error: connect ETIMEDOUT 54.187.174.169:443`);
    console.error(`    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1187:16)`);
    return res.status(500).json({ error: 'Payment processing failed' });
  }

  console.log(`[INFO] user_id=${userId} Checkout successful, order created`);
  carts.delete(userId);
  res.json({ success: true, orderId: `ORD-${Date.now()}` });
});

// GET /api/users/:id — intermittent null reference
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  console.log(`[INFO] Fetching user profile for user_id=${userId}`);

  // Simulate intermittent null reference bug
  if (Math.random() < 0.3) {
    console.error(`[ERROR] TypeError: Cannot read properties of null (reading 'preferences')`);
    console.error(`    at getUserProfile (/app/services/user-service.js:42:28)`);
    console.error(`    at /app/routes/users.js:15:20`);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // DB query logging
  console.log(`[DEBUG] db_query=SELECT * FROM users WHERE id = '${userId}'`);

  res.json({
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
    preferences: { theme: 'dark' },
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
