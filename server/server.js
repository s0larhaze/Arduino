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

// DB SETUP
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

createTablesQuery = () => {
  return new Promise((resolve, reject) => {

    createObjectsTable = () => {
      return new Promise((resolve, reject) => {
        sqlcon.query(`create table if not exists objects 
        (
        id int auto_increment primary key,
          name text,
          status tinyint
        )`, (err, result) => {
          if (err) reject(err);
          resolve(result);
        })
      })
    }

    createMeasurementsTable = () => {
      return new Promise((resolve, reject) => {
        sqlcon.query(`create table if not exists measurements 
          (
          id int auto_increment primary key, 
            avg_current float,
            avg_voltage float,
            start_timestamp timestamp,
            end_timestamp timestamp,
            object_id int
          )`, (err, result) => {
          if (err) reject(err);
          resolve(result);
        })
      })
    }

    createEmergencyTable = () => {
      return new Promise((resolve, reject) => {
        sqlcon.query(`create table if not exists emergency 
          (
            id int auto_increment primary key,
            current float,voltage float,
            timestamp timestamp,
            object_id int
          )`, (err, result) => {
          if (err) reject(err);
          resolve(result);
        })
      })
    }

    createObjectsTable()
      .then(createMeasurementsTable)
      .then(createEmergencyTable)
      .then(() => {
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      })
  });
};

SQLConnectQuery()
  .then(createDBQuery)
  .then(useBatteryQuery)
  .then(createTablesQuery)
  .then(() => {
    console.log("All DB setups have been finished succesfully!");
  })
  .catch((err) => {
    console.log(err);
  });
// END DB SETUP

app.get("/", (req, res) => {
  console.log(`User ${req.ip} has connected to the root.`);

  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/getListOfObjects', (req, res) => {
  sqlcon.query("select * from objects", (err, result) => {
    if (err) throw err;

    console.log(result);
    res.type("json");
    res.send(result);
  })
});

app.post('/api/getObjectMeasurementData', (req, res) => {

  console.log("Got getData query!");

  selectAll = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query("select * from measurements", (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  }

  selectAll()
    .then((result) => {
      console.log(result);
      res.type("json");
      res.send(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post('/api/executePlannedMeasurement', (req, res) => {
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
          values (${object_id}, ${+new Date}, ${jsonData.current}, ${jsonData.voltage}, ${jsonData.time})`, (err) => {
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

app.listen(3000);




// Get objects: get all the data of objects from the db
// Get object data: get all the measurement data of the object from the db
// Send measure request: 
// Get emergency data: 

