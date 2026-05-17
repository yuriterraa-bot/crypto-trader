const https = require('https');

const postData = JSON.stringify({ is_running: true });

const postOptions = {
  hostname: 'crypto-trader-blond.vercel.app',
  port: 443,
  path: '/api/bot/config',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req1 = https.request(postOptions, res1 => {
  let body1 = '';
  res1.on('data', d => body1 += d);
  res1.on('end', () => {
    console.log("=== POST RESULT ===");
    console.log(body1);
    
    // Now GET
    https.get('https://crypto-trader-blond.vercel.app/api/bot/config', res2 => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => {
        console.log("\n=== GET AFTER POST ===");
        console.log(body2);
      });
    });
  });
});

req1.on('error', console.error);
req1.write(postData);
req1.end();
