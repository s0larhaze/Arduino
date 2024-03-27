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
const uuid = require('uuid');

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

var connectedObjects = new Map();
var connectedUsers = new Array();

app.use(express.json());
app.use("/socket", express.static('socket'))
app.use(cors({
  allowedHeaders: ['Content-Type']
}))

wss.on('connection', (ws) => {
  console.log("Connection!");

  connectedUsers.push(ws);

  ws.on('message', (message) => {
    handleMessage(message, ws);
  })

  ws.on('close', () => {
    console.log('Connection closed!');
    for (let index = 0; index < connectedUsers.length; index++) {
      if (connectedUsers[index] === ws) {
        connectedUsers.splice(index, 1);
      }
    }
  });

  console.log(connectedUsers.length);
})

function getObjectSocket(object_id) {
  keys = connectedObjects.keys();

  for (let i = 0; i < keys.length; i++) {
    if (keys[i].object_id === object_id)
      return connectedObjects.values()[i];
  }

  return null;
}

function getObjectIdByName(name) {
  return new Promise((resolve, reject) => {
    sqlcon.query(`select id as object_id from objects where name = '${name}'`, (err, result) => {
      if (err) reject(err);
      resolve(result[0].object_id);
    })
  })
}

function handleMessage(message, ws) {
  let message_json = JSON.parse(message);
  const type = message_json.type;

  switch (type) {
    case 'arduinoStartedMeasurement':
      measurementStartedDBOperation(object_id);
      break;
    case 'arduinoFinishedMeasurement':
      measurementFinishedDBOperation(data.avg_current, data.avg_voltage, object_id);
      break;
    case 'arduinoEmergency':
      emergencyHandler(data.current, data.voltage, object_id);
      break;
    case 'arduinoEmergencyStopped':
      emergencyStoppedHandler(object_id);
      break;
    case 'arduinoObjectRegistration':
      objectRegistrationHandler(object_id, ws);
      break;
    case 'getCurrentObjectRegistrationSocket':
      console.log(connectedObjects.get(object_id));
      console.log("ObjectId:");
      console.log(object_id);
      ws.send(JSON.stringify({ type: "getCurrentObjectRegistrationSocket", data: { objectSocket: connectedObjects.get(object_id) } }))
      break;
    case 'executePlannedMeasurement':
      console.log(connectedObjects.keys());
      object_socket = connectedObjects.get(object_id); // not working, gotta find a better solution
      executePlannedMeasurementHandler(object_id, object_socket);
      break;
    case 'getObjects':
      getObjectsHandler(ws);
      break;
    case 'getObjectMeasurementData':
      getObjectMeasurementDataHandler(object_id, ws);
      break;
    case 'getObjectData':
      let name = message_json.name;
      getObjectIdByName(name)
        .then((result) => {
          object_id = result;
          console.log("OBJECT_ID = " + object_id);
          getObjectData(object_id, name, ws);
        })
      break;
    case 'startMockEmergency':
      console.log(connectedObjects.keys());
      object_socket = connectedObjects.get(object_id); // not working, gotta find a better solution
      startMockEmergencyHandler(object_id, object_socket);
      break;
    case 'reset':
      resetHandler(object_id);
      break;
    default:
      console.log('Unknown message type:', type);
  }
}

function emergencyStoppedHandler() {
  // todo
}

function getObjectData(object_id, name, ws) {
  object_name = '';
  current = null;
  console.log(object_id);
  history = [];

  getObjectName = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select name from objects where id = ${object_id};`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      })
    });
  }

  getEmergencyData = (object_name) => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select * from emergency where object_id = ${object_id} order by timestamp desc;`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    })
  }

  getMeasurementsData = (object_name) => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select id, avg_current as current, avg_voltage as voltage, start_timestamp, end_timestamp as timestamp, object_id from measurements where object_id = ${object_id};`, (err, result) => {
        if (err) reject(err);
        console.log(result);
        resolve(result);
      });
    })
  }

  getObjectName()
    .then(name_of_object => {
      object_name = name_of_object;
    })
    .then(getEmergencyData, object_name)
    .then(emergencies => {
      current = emergencies[0] || null;
      for (let index = 1; index < emergencies.length; index++) {
        history.push(emergencies[index]);
      }
    })
    .then(getMeasurementsData, object_name)
    .then(measurements => {

      for (let index = 0; index < measurements.length; index++) {
        history.push(measurements[index]);
      }
      (current)
        ? ws.send(JSON.stringify({ type: 'getObjectData', name: object_name[0], data: { 'history': history } }))
        : ws.send(JSON.stringify({ type: 'getObjectData', name: object_name[0], data: { 'current': current, 'history': history } }));
    })
}

function startMockEmergencyHandler(object_id, ws) {
  wss.clients.forEach(elem => {
    elem.send(JSON.stringify({ type: "startMockEmergency", data: object_id }));
  })
}

function getObjectMeasurementDataHandler(object_id, ws) {
  if (object_id === '') {
    console.log("object_id cannot be empty");
    return;
  }

  sqlcon.query(`SELECT * FROM measurements WHERE object_id = ${object_id}`, (err, result) => {
    if (err) throw err;
    ws.send(JSON.stringify({ type: 'getObjectMeasurementData', data: result }));
  });
}

function emergencyHandler(current, voltage, object_id, ws) {

  insertIntoEmergency = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`insert into emergency (current, voltage, timestamp, object_id) values
      (
        ${current},
        ${voltage},
        '${moment().format('YYYY-MM-DD HH:mm:ss')}',
        ${object_id}
      )`, err => {
        if (err) reject(err);
        resolve(result);
      })
    })
  }

  object_name = '';
  current = null;
  console.log(object_id);
  history = [];

  getObjectName = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select name from objects where id = ${object_id};`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      })
    });
  }

  getEmergencyData = (object_name) => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select * from emergency where object_id = ${object_id} order by timestamp desc;`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    })
  }

  getMeasurementsData = (object_name) => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select id, avg_current as current, avg_voltage as voltage, start_timestamp, end_timestamp as timestamp, object_id from measurements where object_id = ${object_id};`, (err, result) => {
        if (err) reject(err);
        console.log(result);
        resolve(result);
      });
    })
  }

  insertIntoEmergency()
    .then(getObjectName)
    .then(name_of_object => {
      object_name = name_of_object;
    })
    .then(getEmergencyData, object_name)
    .then(emergencies => {
      current = emergencies[0];

      for (let index = 1; index < emergencies.length; index++) {
        history.push(emergencies[index]);
      }

      console.log("History");
      console.log(history);
    })
    .then(getMeasurementsData, object_name)
    .then(measurements => {

      for (let index = 0; index < measurements.length; index++) {
        history.push(measurements[index]);
      }

      console.log("History");
      console.log(history);

      ws.send(JSON.stringify({ type: 'objectDataChanges', data: { 'current': current, 'history': history } }));
    })
}

function objectRegistrationHandler(object_id, ws) {

  if (object_id === '' || object_id === undefined || object_id === null) {
    console.log("object_id cannot be empty, undefined or null");
    return;
  }

  checkIfObjectAlreadyRegistered = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select count (*) as count from objects where id = ${object_id}`, (err, result) => {
        if (err) reject(err);
        resolve(result[0].count);
      });
    })
  }

  registerObject = () => {
    sqlcon.query(`insert into objects (id, name, status) values
    (
      ${object_id},
      'Безымянный объект',
      0
    )`, (err) => {
      if (err) throw err;
    })
  }

  checkIfObjectAlreadyRegistered()
    .then(count => {
      if (count === 0) {
        registerObject();
      }
      connectedObjects.set(object_id, ws)
      console.log(connectedObjects.get(object_id))
    })
    .catch(err => {
      console.log("Cathed an error");
      console.log(err);
    })
}

function resetHandler(object_id) {

  if (object_id === '') {
    console.log("object_id cannot be empty");
    return;
  }

  createArchiveDBQuery = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query("create database if not exists archive_battery", (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  };

  useArchiveBatteryQuery = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query("use archive_battery", (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  };

  createArchiveTablesQuery = () => {
    return new Promise((resolve, reject) => {

      createObjectsTable = () => {
        return new Promise((resolve, reject) => {
          sqlcon.query(`create table if not exists objects
        (
        id int,
          name text,
          status tinyint
        )`, (err, result) => {
            if (err) reject(err);
            resolve(result);
          })
        })
      }

      createArchiveMeasurementsTable = () => {
        return new Promise((resolve, reject) => {
          sqlcon.query(`create table if not exists measurements
          (
            id int,
            avg_current float,
            avg_voltage float,
            start_timestamp timestamp,
            end_timestamp timestamp,
            object_id int,
            isReferential boolean
          )`, (err, result) => {
            if (err) reject(err);
            resolve(result);
          })
        })
      }

      createArchiveEmergencyTable = () => {
        return new Promise((resolve, reject) => {
          sqlcon.query(`create table if not exists emergency
          (
            id int,
            current float,voltage float,
            timestamp timestamp,
            object_id int
          )`, (err, result) => {
            if (err) reject(err);
            resolve(result);
          })
        })
      }

      createArchiveObjectsTable()
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

  createArchiveDBQuery
    .then(useArchiveBatteryQuery)
    .then(createArchiveTablesQuery)
    .then(() => {
      console.log("Archive DB is ready...");
    })
    .then(useBatteryQuery)
    .catch((err) => {
      console.log(err);
    });

  dumpMeasurementRecords = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`insert into archive_battery.measurements select * from battery.measurements where object_id = ${object_id}`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      })
    })
  }

  dumpEmergencyRecords = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`insert into archive_battery.emergency select * from battery.emergency where object_id = ${object_id}`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      })
    })
  }

  resetMeasurementRecords = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`delete from measurements where object_id = ${object_id}`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      })
    })
  }

  resetEmergencyRecords = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`delete from emergency where object_id = ${object_id}`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      })
    })
  }

  dumpMeasurementRecords()
    .then(dumpEmergencyRecords)
    .then(resetMeasurementRecords)
    .then(resetEmergencyRecords)
    .then(() => {
      ws.send('clearData', { status: "true" });
    })
    .catch(err => {
      console.log(err);
      ws.send('clearData', { status: "false" });
    });
}

function deleteObject() {
  // todo
}

function measurementStartedDBOperation(object_id) {

  if (object_id === '') {
    console.log("object_id cannot be empty");
    return;
  }

  checkIfRecordsExist = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select count(*) as count from measurements`, (err, result) => {
        if (err) reject(err);
        resolve(result[0].count);
      })
    })
  }

  insertRecordWithReferentialFlag = () => {
    console.log("Trying to insert with referential flag...");
    sqlcon.query(`insert into measurements
      (start_timestamp, object_id, isReferential) values ('${moment().format('YYYY-MM-DD HH:mm:ss')}', ${object_id}, 1)`, (err) => {
      if (err) throw err;
      console.log("Succesfully inserted.");
    })
  }

  insertRecord = () => {
    sqlcon.query(`insert into measurements
      (start_timestamp, object_id) values ('${moment().format('YYYY-MM-DD HH:mm:ss')}', ${object_id})`, (err) => {
      if (err) throw err;
    })
  }

  checkIfRecordsExist()
    .then(count => {
      if (count === 0) {
        insertRecordWithReferentialFlag();
      } else {
        insertRecord();
      }
    }).catch(err => {
      console.log(err);
    })
}

function measurementFinishedDBOperation(avg_current, avg_voltage, object_id) {
  sqlcon.query(`update measurements set
    avg_current = ${avg_current},
    avg_voltage = ${avg_voltage},
    end_timestamp = '${moment().format('YYYY-MM-DD HH:mm:ss')}',
    isReferential = 0
    where object_id = ${object_id} and end_timestamp is NULL`, (err) => {
    if (err) throw err;
  })
}

function executePlannedMeasurementHandler(object_id, object_socket) {
  if (object_id === '') {
    console.log("object_id cannot be empty");
    return;
  }

  object_socket.send(JSON.stringify({ type: "executePlannedMeasurement" }));

  // wss.clients.forEach((client) => {
  //   client.send(JSON.stringify({ type: "executePlannedMeasurement" }));
  // })
}

function getObjectsHandler(ws) {
  sqlcon.query(`SELECT id, name, status
                      FROM objects`, (err, result) => {
    if (err) throw err;
    ws.send(JSON.stringify({ type: 'getObjects', data: result }));
  });
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
        id int primary key,
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
            object_id int,
            isReferential boolean
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

server.listen(3000, () => {
  console.log("Server is running...");
});
