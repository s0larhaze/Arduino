const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const axios = require('axios');
const serial = require('serialport');
const cors = require('cors');
const { ReadlineParser } = require('@serialport/parser-readline')
const fs = require('fs');
const path = require('path');
const app = express();
const readline = require('node:readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

app.use(express.json());

app.use(cors({
  allowedHeaders: ['Content-Type']
}))

const port = new serial.SerialPort({ path: "/dev/ttyUSB0", baudRate: 9600 });
const parser = new ReadlineParser();

port.pipe(parser);
parser.on('data', console.log);

app.get("/", (req, res) => {
  console.log(`User ${req.ip} has connected to the root.`);

  fs.readFile("./index.html", (err, data) => {
    if (err) throw err;

  });

  res.sendFile(path.join(__dirname, 'index.html'));

  // port.write("bruh", (err) => {
  //   if (err) throw err;
  //
  //   console.log("Written.");
  // });
});

// app.post('/', (req, res) => {
//   console.log("Got data from the user! Body: ", req.body);
//   payload = req.body;
//   console.log("Message:", payload.message);
//   res.type('json');
//   res.send("Hello");
// });

// axios.defaults.baseURL = "http://127.0.0.1:3001";
//
// axios.post('', {
//   "message": "measure"
// }).then((response) => {
//
//   if (response.status === 200) {
//     console.log("Body:");
//   }
// });

const sqlcon = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
})

sqlcon.connect((err) => {
  if (err) throw err;
  console.log("Connection established successfully!");
});

function sqlsetup() {

}

app.post('/api/getObjects', (req, res) => {
  sqlcon.query("create database if not exists battery", (err, result) => {
    if (err) throw err;

    sqlcon.query("use battery", (err, result) => {
      if (err) throw err;

      sqlcon.query("create table if not exists objects (id int not null auto_increment primary key, name text, status tinyint)", (err, result) => {
        if (err) throw err;

        sqlcon.query("select * from objects", (err, result) => {
          if (err) throw err;

          console.log(result);
          res.type("json");
          res.send(result);
        });
      });
    });
  });
});

app.post('/api/getData', (req, res) => {

  console.log("Got getData query!");
  sqlcon.query("create database if not exists battery", (err, result) => {
    if (err) throw err;

    sqlcon.query("use battery", (err, result) => {
      if (err) throw err;

      // sqlcon.query('create table if not exists measurements(id int not null auto_increment primary key, mdate date, avg_current float, avg_voltage float, avg_temperature float, avg_power float, time_lasted int);', (err, result, fields) => {
      sqlcon.query('create table if not exists measurements (id int auto_increment primary key, object_id int, date_time datetime, current float, voltage float, time bigint)', (err, result, fields) => {
        if (err) throw err;

        sqlcon.query("select * from measurements", (err, result) => {
          if (err) throw err;

          console.log(result);
          console.log(result);
          res.type("json");
          // res.send(result);
          res.send(result);
        });
      });
    });
  });
});

// app.get('/', (req, res) => {
//   console.log(`User ${req.ip} is in the root directory.`);
//
//   console.log(sqlcon.state);
//   sqlcon.query('use battery', (err) => {
//     if (err) throw err;
//
//     sqlcon.query('select * from measurements order by id desc', (err, result) => {
//       if (err) throw err;
//       console.log("DONE!");
//       console.log(result);
//
//       res.send(result); // DATA ON PAGE
//     });
//   })
//
// });
//
// app.post('/', (req, res) => {
//
//   console.log(`Body: `);
//   const batteryInfoObject = req.body;
//   console.log(batteryInfoObject);
//
//   sqlcon.query('create database if not exists battery', (err, result) => {
//     if (err) throw err;
//
//     sqlcon.query('use battery', (err, result) => {
//       if (err) throw err;
//       console.log(result);
//
//       sqlcon.query('create table if not exists measurements(id int not null auto_increment primary key, mdate date, avg_current float, avg_voltage float, avg_temperature float, avg_power float, time_lasted int);', (err, result, fields) => {
//         if (err) throw err;
//
//         sqlcon.query(`insert into measurements (mdate, avg_current, avg_voltage, avg_temperature, avg_power, time_lasted) values ('${new Date().toISOString().split('T')[0]}', ${batteryInfoObject.current}, ${batteryInfoObject.voltage}, ${batteryInfoObject.temperature}, ${batteryInfoObject.current * batteryInfoObject.voltage}, ${batteryInfoObject.time})`, (err, result) => {
//           if (err) throw err;
//           console.log(result);
//         });
//
//         console.log(result);
//       })
//     })
//   });
//
//   res.send("Hi from nodejs!");
// })

// app.post('/api/measure', (req, res) => {
//   console.log(`User ${req.ip} requested to perform a measurement.`);
//   console.log(`Body: `);
//   console.log(req.body);
//   res.send("Helo");
// });

app.listen(3000);
