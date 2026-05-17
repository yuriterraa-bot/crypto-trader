const https = require('https');

const data = JSON.stringify({ symbol: 'BTCUSDT' });

const options = {
  hostname: 'crypto-trader-blond.vercel.app',
  port: 443,
  path: '/api/bot/run',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch(e) {
      console.log(body);
    }
  });
});

req.on('error', console.error);
req.write(data);
req.end();
