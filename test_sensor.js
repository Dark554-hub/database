const http = require('http');

const data = JSON.stringify({
  temperatura: 24 + Math.random() * 2,
  humedad: 40 + Math.random() * 5,
  luz: 100 + Math.random() * 20
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/sensors',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Estado HTTP: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error('Error enviando datos (¿Está corriendo el servidor en el puerto 3000?):', error.message);
});

req.write(data);
req.end();
