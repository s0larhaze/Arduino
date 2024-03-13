const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const serial = require('serialport');
const cors = require('cors');
const { ReadlineParser } = require('@serialport/parser-readline')
const path = require('path');
const app = express();

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

  res.sendFile(path.join(__dirname, 'index.html'));
});

const sqlcon = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
})

SQLConnectQuery = () => {
  return new Promise((resolve, reject) => {
    sqlcon.connect((err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

createDBQuery = () => {
  return new Promise((resolve, reject) => {
    sqlcon.query("create database if not exists battery", (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

useBatteryQuery = () => {
  return new Promise((resolve, reject) => {
    sqlcon.query("use battery", (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

createObjectsTableQuery = () => {
  return new Promise((resolve, reject) => {
    sqlcon.query(`create table if not exists objects 
      (id int not null auto_increment primary key, name text, status tinyint)`, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

SQLConnectQuery()
  .then(createDBQuery)
  .then(useBatteryQuery)
  .then(createObjectsTableQuery)
  .catch((err) => {
    console.log(err);
  });

app.post('/api/getObjects', (req, res) => {
  sqlcon.query("select * from objects", (err, result) => {
    if (err) throw err;

    console.log(result);
    res.type("json");
    res.send(result);
  })
});

app.post('/api/getData', (req, res) => {

  console.log("Got getData query!");

  createMeasurementsTable = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`create table if not exists measurements 
                    (id int auto_increment primary key, object_id int, date_time datetime, current float, voltage float, time bigint)`,
        (err, result, fields) => {
          if (err) reject(err);
          resolve(result);
        });
    })
  }

  selectAll = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query("select * from measurements", (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  }

  createMeasurementsTable()
    .then(selectAll)
    .then((result) => {
      console.log(result);
      res.type("json");
      res.send(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post('/api/startCheck', (req, res) => {
  object_id = req.body.object_id;
  console.log(object_id);

  parser.on('data', (data) => {
    let buffer = "";
    buffer += data;
    const start = buffer.indexOf('{');
    const end = buffer.lastIndexOf('}');
    if (start !== -1 && end !== -1 && start < end) {
      const jsonString = buffer.substring(start, end + 1);
      try {
        const jsonData = JSON.parse(jsonString);
        console.log(jsonData);

        sqlcon.query(`insert into measurements 
          (object_id, date_time, current, voltage, time) 
          values (${object_id}, ${'2011-03-11 00:00:00'}, ${jsonData.current}, ${jsonData.voltage}, ${jsonData.time})`, (err) => {
          if (err) throw err;
        });

        res.type('json');
        res.send(jsonData);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        console.log('Raw JSON string:', jsonString);
      }
      buffer = buffer.substring(end + 1);
    }
  });

  port.write("measure", (err) => {
    if (err) throw err;
  });
})

app.post('/api/getMeasures', (req, res) => {
  sqlcon.query(`select * from measurements`, (err, result) => {
    if (err) throw err;

    res.type('json');
    res.send(result);
  });
});

app.listen(3000);
