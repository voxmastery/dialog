// Traffic generator for the demo app
const BASE = 'http://localhost:3000';

const users = ['user-101', 'user-202', 'user-303', 'user-404'];

function makeJwt(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId, sessionId: `sess-${userId}` })).toString('base64url');
  return `${header}.${payload}.nosig`;
}

async function simulateUser(userId) {
  const headers = {
    'Authorization': `Bearer ${makeJwt(userId)}`,
    'Content-Type': 'application/json',
    'x-user-id': userId,
  };

  try {
    // Browse products
    await fetch(`${BASE}/products`, { headers });
    await sleep(500);

    // Add to cart
    await fetch(`${BASE}/cart/add`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId: 1, quantity: 2 }),
    });
    await sleep(300);

    // Try checkout
    await fetch(`${BASE}/checkout`, {
      method: 'POST',
      headers,
    });
    await sleep(200);

    // View profile
    await fetch(`${BASE}/api/users/${userId}`, { headers });
  } catch (err) {
    console.error(`Error simulating ${userId}:`, err.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Generating traffic...');
  for (let round = 0; round < 5; round++) {
    console.log(`Round ${round + 1}/5`);
    for (const user of users) {
      simulateUser(user);
      await sleep(100);
    }
    await sleep(2000);
  }
  console.log('Done generating traffic.');
}

main();
