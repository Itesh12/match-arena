async function test() {
  try {
    const loginRes = await fetch('http://127.0.0.1:5001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'Itesh', password: 'password123' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData.token ? 'Success' : loginData);
    
    if (loginData.token) {
      const shopRes = await fetch('http://127.0.0.1:5001/shop', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      const shopData = await shopRes.json();
      console.log('Shop Items Endpoint:', shopData);
    }
  } catch(e){
    console.log(e);
  }
}
test();
