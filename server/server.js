const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const serial = require('serialport');
const cors = require('cors');
const moment = require('moment');
const { ReadlineParser } = require('@serialport/parser-readline')
const path = require('path');
const { createServer } = require('node:http');
const WebSocket = require('ws');

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use("/socket", express.static('socket'))
app.use(cors({
  allowedHeaders: ['Content-Type']
}))

wss.on('connection', (ws) => {
  console.log("Connection! " + ws.url);

  ws.on('message', (message) => {
    handleMessage(message, ws);
  })

  ws.on('close', () => {
    console.log('Connection closed!');
  });
})

// const port = new serial.SerialPort({ path: "/dev/ttyUSB0", baudRate: 9600 });
// const parser = port.pipe(new ReadlineParser());
// parser.on('data', arduinoMessageHandler)
//

function handleMessage(message, ws) {
  // Handle different types of messages
  console.log(JSON.parse(JSON.stringify(message)));
  try {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'executePlannedMeasurementRequest':
        port.write("measure", (err) => {
          if (err) throw err;
        });
        break;
      case 'getListOfObjectsRequest':
        sqlcon.query(`SELECT obj.id, name, status, start_timestamp AS timestamp
                              FROM objects AS obj LEFT JOIN measurements AS m ON obj.id = m.object_id 
                              ORDER BY timestamp DESC`, (err, result) => {
          if (err) throw err;
          ws.send(JSON.stringify({ type: 'getListOfObjectsResponse', data: result }));
        });
        break;
      case 'getObjectMeasurementDataRequest':
        const { object_id } = data;
        sqlcon.query(`SELECT * FROM measurements WHERE object_id = ${object_id}`, (err, result) => {
          if (err) throw err;
          ws.send(JSON.stringify({ type: 'getObjectMeasurementDataResponse', data: result }));
        });
        break;
      case 'startMockEmergencyRequest':
        port.write("emergency", (err) => {
          if (err) throw err;
        });
        break;
      case 'hello':
        ws.send(JSON.stringify({ type: 'HelloResponse', data: "Hello you too!" }));
      default:
        console.log('Unknown message type:', data.type);
    }
  } catch (error) {
    console.error('Failed to parse message:', message);
  }
}

function arduinoMessageHandler(message) {
  measurementStartedDBOperation = (object_id) => {
    sqlcon.query(`insert into measurements 
      (start_timestamp, object_id) values ('${moment().format('YYYY-MM-DD HH:mm:ss')}', ${object_id})`, (err) => {
      if (err) throw err;
    })
  }

  measurementFinishedDBOperation = (avg_current, avg_voltage, object_id) => {
    sqlcon.query(`update measurements set 
      avg_current = ${avg_current},
      avg_voltage = ${avg_voltage},
      end_timestamp = '${moment().format('YYYY-MM-DD HH:mm:ss')}'
      where object_id = ${object_id} and end_timestamp is NULL`, (err) => {
      if (err) throw err;
    })
  }

  emergencyHandlingDBOperation = (current, voltage, object_id) => {
    sqlcon.query(`insert into emergency (current, voltage, timestamp, object_id) values 
      (${current},
        ${voltage},
        '${moment().format('YYYY-MM-DD HH:mm:ss')}',
        ${object_id})`, (err) => {
      if (err) throw err;
    })
  }

  try {
    jsonMessage = JSON.parse(message);

    switch (jsonMessage.message_type) {
      case messageTypes.MESSAGE_STARTED_MEASURING:
        measurementStartedDBOperation(jsonMessage.object_id);
        console.log("Measurement insert operation is done!");
        break;
      case messageTypes.MESSAGE_FINISHED_MEASURING:
        measurementFinishedDBOperation(jsonMessage.avg_current,
          jsonMessage.avg_voltage,
          jsonMessage.object_id);
        console.log("Measurement update operation is done!");
        break;
      case messageTypes.MESSAGE_EMERGENCY:
        emergencyHandlingDBOperation(jsonMessage.current,
          jsonMessage.voltage,
          jsonMessage.object_id)
        console.log("Emergency insert operation is done!");
        break;
    }

    console.log(jsonMessage);
  }
  catch (err) {
    console.log("Failed to parse json of " + message);
  }
}

// ENUMS
const objectStates = {
  OBJECT_CHILL: 0,
  OBJECT_MEASURING: 1,
  OBJECT_EMERGENCY: 2,
}

const messageTypes = {
  MESSAGE_STARTED_MEASURING: 0,
  MESSAGE_FINISHED_MEASURING: 1,
  MESSAGE_EMERGENCY: 2
}
// END ENUMS

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

// app.post('/api/getListOfObjects', (req, res) => {
//   sqlcon.query("select * from objects", (err, objects) => {
//     if (err) throw err;
//     // res.type("json");
//     // res.send(result);
//
//     objects.forEach(object => {
//       if (object.status == objectStates.OBJECT_MEASURING) {
//         sqlcon.query(`select start_timestamp from measurements 
//           where object_id = ${object.id} and end_timestamp = NULL`, (err, result) => {
//           object.timestamp = result.start_timestamp;
//           console.log(object);
//         })
//       }
//     });
//   })
// });
//
// app.post('/api/getObjectMeasurementData', (req, res) => {
//
//   console.log("Got getData query!");
//
//   selectAll = () => {
//     return new Promise((resolve, reject) => {
//       sqlcon.query("select * from measurements", (err, result) => {
//         if (err) reject(err);
//         resolve(result);
//       });
//     });
//   }
//
//   selectAll()
//     .then((result) => {
//       console.log(result);
//       res.type("json");
//       res.send(result);
//     })
//     .catch((err) => {
//       console.log(err);
//     });
// });
//
// app.post('/api/executePlannedMeasurement', (req, res) => {
//   object_id = parseInt(req.body.object_id);
//   console.log(object_id);
//
//   console.log(parser.listenerCount());
//
//   // parser.on('data', (data) => {
//   //   console.log("Got arduino's answer: " + data);
//   //
//   //   let buffer = "";
//   //   buffer += data;
//   //   const start = buffer.indexOf('{');
//   //   const end = buffer.lastIndexOf('}');
//   //   if (start !== -1 && end !== -1 && start < end) {
//   //     const jsonString = buffer.substring(start, end + 1);
//   //     try {
//   //       const jsonData = JSON.parse(jsonString);
//   //       console.log(jsonData);
//   //
//   //       res.type('json');
//   //       res.send(jsonData);
//   //     } catch (error) {
//   //       console.error('Error parsing JSON:', error);
//   //       console.log('Raw JSON string:', jsonString);
//   //     }
//   //     buffer = buffer.substring(end + 1);
//   //   }
//   // });
//
//   port.write("measure", (err) => {
//     if (err) throw err;
//   });
// })
//
// app.post('/api/startMockEmergency', (req, res) => {
//   console.log(req.body);
//
//   port.write("emergency", (err) => {
//     if (err) throw err;
//   });
// })

server.listen(3000, () => {
  console.log("Ran server on http://localhost:3000");
});

// Get objects: get all the data of objects from the db
// Get object data: get all the measurement data of the object from the db
// Send measure request: 
// Get emergency data: 

