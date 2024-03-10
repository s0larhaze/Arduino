const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const fs = require('fs');
const app = express();

app.use(express.json());

const sqlcon = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
})

sqlcon.connect((err) => {
  if (err) throw err;
  console.log("Connection established successfully!");
});

app.get('/', (req, res) => {
  console.log(`User ${req.ip} is in the root directory.`);

  console.log(sqlcon.state);
  sqlcon.query('use battery', (err) => {
    if (err) throw err;

    sqlcon.query('select * from measurements order by id desc', (err, result) => {
      if (err) throw err;
      console.log("DONE!");
      console.log(result);

      res.send(result); // DATA ON PAGE
    });
  })

});

app.post('/', (req, res) => {
  console.log(`Body: `);
  const batteryInfoObject = req.body;
  console.log(batteryInfoObject);

  sqlcon.query('create database if not exists battery', (err, result) => {
    if (err) throw err;

    sqlcon.query('use battery', (err, result) => {
      if (err) throw err;
      console.log(result);

      sqlcon.query('create table if not exists measurements(id int not null auto_increment primary key, mdate date, avg_current float, avg_voltage float, avg_temperature float, avg_power float, time_lasted int);', (err, result, fields) => {
        if (err) throw err;

        sqlcon.query(`insert into measurements (mdate, avg_current, avg_voltage, avg_temperature, avg_power, time_lasted) values ('${new Date().toISOString().split('T')[0]}', ${batteryInfoObject.current}, ${batteryInfoObject.voltage}, ${batteryInfoObject.temperature}, ${batteryInfoObject.current * batteryInfoObject.voltage}, ${batteryInfoObject.time})`, (err, result) => {
          if (err) throw err;
          console.log(result);
        });

        console.log(result);
      })
    })
  });

  res.send("Hi from nodejs!");
})

app.post('/api/measure', (req, res) => {
  console.log(`User ${req.ip} requested to perform a measurement.`);
  console.log(`Body: `);
  console.log(req.body);
  res.send("Helo");
});

app.listen(3000);
