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

let connectedObjects = {};
let connectedUsers = new Array();

app.use(express.json());
app.use("/socket", express.static('socket'))
app.use(cors({
  allowedHeaders: ['Content-Type']
}))

wss.on('connection', (socket) => {
  console.log("Connection!");

  socket.on('message', message => {
    handleMessage(message, socket);
  });

  socket.onclose = () => {
    console.log('Connection closed!');
    for (let index = 0; index < connectedUsers.length; index++) {
      if (connectedUsers[index] === socket) {
        connectedUsers.splice(index, 1);
      }
    }
  };

  console.log(connectedUsers.length);
})

function userObjectRegistration(ws) {
  connectedUsers.push(ws);
  getObjectsHandler(ws);
}

function objectRegistrationHandler(object_id, ws) {

  if (!object_id) {
    console.log("object_id cannot be empty, undefined or null");
    return;
  }

  checkIfObjectPresentInDB()
    .then(count => {
      if (!count)
        createObjectInDB();

      connectedObjects[object_id] = ws;
      console.log(connectedObjects.get(object_id));
    })
    .catch(err => {
      console.log("Cathed an error", err);
    })

  checkIfObjectPresentInDB = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select count (*) as count from objects where id = ${object_id}`, (err, result) => {
        if (err) reject(err);
        resolve(result[0].count);
      });
    })
  }

  createObjectInDB = () => {
    sqlcon.query(`insert into objects (id, name, status) values
    (
      ${object_id},
      'Безымянный объект',
      0
    )`, (err) => {
      if (err) throw err;
    })
  }
}

function handleMessage(message, ws) {
  let message_json = null;
  let type = null;
  let data = null;
  try {
    message_json = JSON.parse(message);
    console.log("MESSAGE_JSON", message_json);
    type = message_json.type;
    data = message_json.data;
  } catch {
    console.log("No reasonable message.");
  }

  switch (type) {
    // Adruino related message handling
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



    // Adruino-unrelated message handling
    case 'userObjectRegistration':
      userObjectRegistration(ws);
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
      let name = data.name;
      getObjectIdByName(name)
        .then((result) => {
          object_id = result;
          console.log("OBJECT_ID = " + object_id);
          getObjectData(object_id, name, ws);
        })
      break;
    case 'startMockEmergency':
      console.log(connectedObjects.keys());
      object_socket = connectedObjects[object_id];
      startMockEmergencyHandler(object_id, object_socket);
      break;
    case 'clearData':
      clearData(object_id);
      break;
    case 'deleteObject':
      deleteObject(object_id);
      break;
    case 'changeObjectName':
      changeObjectName(object_id);
      break;
    default:
      console.log('Unknown message type:', type);
  }
}

function measurementStartedDBOperation(object_id) {

  if (!object_id) {
    console.log("object_id cannot be empty");
    return;
  }

  checkIfRecordsExist()
    .then(count => {
      if (!count) {
        insertRecordWithReferentialFlag();
      } else {
        insertRecord();
      }
    }).catch(err => {
      console.log(err);
    })

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
      (start_timestamp, object_id, isReferential) values ('${moment().format('YYYY-MM-DD HH:mm:ss')}', ${object_id}, 0)`, (err) => {
      if (err) throw err;
    })
  }
}

function measurementFinishedDBOperation(avg_current, avg_voltage, object_id) {
  sqlcon.query(`update measurements set
    avg_current = ${avg_current},
    avg_voltage = ${avg_voltage},
    end_timestamp = '${moment().format('YYYY-MM-DD HH:mm:ss')}',
    where object_id = ${object_id} and end_timestamp is NULL`, (err) => {
    if (err) throw err;
  })
}

function emergencyHandler(amperage, voltage, object_id, ws) {

  let object_name = '';
  let current = null;
  let history = [];

  chageObjectStatus()
    .then(insertIntoEmergency)
    .then(getObjectName)
    .then(dbObjectName => {
      object_name = dbObjectName;
    })
    .then(getEmergencyData, object_name)
    .then(emergencies => {
      latest = emergencies[0];

      for (let index = 1; index < emergencies.length; index++) {
        history.push(emergencies[index]);
      }
    })
    .then(getMeasurementsData, object_name)
    .then(measurements => {

      for (let index = 0; index < measurements.length; index++) {
        history.push(measurements[index]);
      }

      if (!current) {
        ws.send(JSON.stringify({ type: 'objectDataChanges', data: { 'history': history } }));
      } else {
        ws.send(JSON.stringify({ type: 'objectDataChanges', data: { 'current': current, 'history': history } }));
      }
    })

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
      sqlcon.query(`select * from emergency where object_id = ${object_id} order by timestamp asc;`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    })
  }

  getMeasurementsData = (object_name) => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`select id, avg_current as current, avg_voltage as voltage, start_timestamp, end_timestamp as timestamp, object_id from measurements where object_id = ${object_id};`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    })
  }

  chageObjectStatus = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`update set status = 2 where id = ${object_id}`, (err, result) => {
        if (err) reject(err);
        resolve(result);
      })
    })
  }
}

function emergencyStoppedHandler(object_id) {
  sqlcon.query(`update set status = 0 where id = ${object_id}`, (err, result) => {
    if (err) throw err;

    for (let i = 0; i < connectedUsers.length; i++) {
      connectedUsers.send(JSON.stringify({ type: 'emergencyStopped', data: { id: object_id } }));
    }
  })
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
      sqlcon.query(`select * from emergency where object_id = ${object_id} order by timestamp asc;`, (err, result) => {
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
        emergencies[index]['status'] = 2;
        history.push(emergencies[index]);
      }
    })
    .then(getMeasurementsData, object_name)
    .then(measurements => {

      for (let index = 0; index < measurements.length; index++) {
        measurements[index]['status'] = 1;
        history.push(measurements[index]);
      }
      (current)
        ? ws.send(JSON.stringify({ type: 'getObjectData', data: { 'history': history.length === 0 ? null : history, name: object_name[0], id: object_id } }))
        : ws.send(JSON.stringify({ type: 'getObjectData', data: { 'current': current, 'history': history.length === 0 ? null : history, name: object_name[0], id: object_id } }));
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


function clearData(object_id) {

  if (!object_id) {
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
      ws.send(JSON.stringify({ type: 'clearData', data: { 'status': true } }));
    })
    .catch(err => {
      console.log(err);
      ws.send(JSON.stringify({ type: 'clearData', data: { 'status': false, 'reason': err } }));
    });
}

function deleteObject(object_id, ws) {

  deleteObjectFromDB = () => {
    return new Promise((resolve, reject) => {
      sqlcon.query(`delete from objects where id = ${object_id}`, (err, result) => {
        if (err) {
          ws.send(JSON.stringify({ type: 'deleteObject', data: { 'status': false, 'reason': err.message } }));
          throw err;
        }
        ws.send(JSON.stringify({ type: 'deleteObject', data: { 'status': true } }));
      })
    })
  }

  clearData(object_id)
    .then(deleteObjectFromDB);
}

function changeObjectName(object_name, new_name, ws) {
  sqlcon.query(`update set name = ${new_name} where name = ${object_name}`, (err, result) => {
    if (err) {
      ws.send(JSON.stringify({ type: 'changeObjectName', data: { 'status': false, 'reason': err.message } }));
      throw err;
    }
    ws.send(JSON.stringify({ type: 'changeObjectName', data: { 'status': true } }));
  })
}


function executePlannedMeasurementHandler(object_id, object_socket) {
  if (!object_id) {
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

function getObjectIdByName(name) {
  return new Promise((resolve, reject) => {
    sqlcon.query(`select id as object_id from objects where name = '${name}'`, (err, result) => {
      if (err) reject(err);
      resolve(result[0].object_id);
    })
  })
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
