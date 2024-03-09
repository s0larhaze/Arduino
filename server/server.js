const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  console.log(`User ${req.ip} is in the root directory.`);
  res.send("Helo");
});

app.post('/api/measure', (req, res) => {
  console.log(`User ${req.ip} requested to perform a measurement.`);
  console.log(`Body: `);
  console.log(req.body);
  res.send("Helo");
});

app.listen(3000);
