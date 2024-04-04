"use strict";
// При проверке
// Я отправляю тебе запрос на проверку.
// Ты отправляешь ответ со статусом
// Ты отправляешь ответ, что объекты изменились

// При сработке
// Ты отправляешь мне objectsChanges
// Ты отправляешь мне objectDataChanges 
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

    const checkIfObjectPresentInDB = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select count (*) as count from objects where id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result[0].count);
            });
        })
    }

    const createObjectInDB = () => {
        sqlcon.query(`insert into objects (id, name, status) values
    (
      ${object_id},
      'Безымянный объект',
      0
    )`, (err) => {
            if (err) throw err;
        })
    }

    checkIfObjectPresentInDB()
        .then(count => {
            if (!count)
                createObjectInDB();

            connectedObjects[object_id] = ws;
            // console.log("CONNECTEDOBJECTS", connectedObjects[object_id]);
        })
        .catch(err => {
            console.log("Cathed an error", err);
        })
}

function handleMessage(message, ws) {
    let message_json = null;
    let type = null;
    let data = null;
    let object_id = null;
    try {
        message_json = JSON.parse(message);
        console.log("MESSAGE_JSON", message_json);
        type = message_json.type;
        data = message_json.data;
        object_id = data.id;
    } catch {
        console.log("No reasonable message.");
    }
    console.log("mtype", type);
    let object_socket = null;

    switch (type) {
        // Adruino related message handling
        case 'arduinoStartedMeasurement':
            measurementStartedDBOperation(object_id);
            break;
        case 'arduinoFinishedMeasurement':
            console.log("ARDUINODATA", data);
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
        case 'startChecking':
            object_socket = connectedObjects[data.id]; // not working, gotta find a better solution
            if (!object_socket) {
                console.log("object_socket is not present.");
                break;
            }
            // Объектов нема, вернуть
            startChecking(data.id, object_socket);
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
                    let object_id = result;
                    console.log("OBJECT_ID = " + object_id);
                    console.log("_+_______________GETOBJECTDATAHERE");
                    console.log("[[[[OBJECT_ID", object_id);
                    console.log("[[[[name", data.name);
                    getObjectData(object_id, data.name, ws);
                })
            break;
        case 'startMockEmergency':
            object_socket = connectedObjects[data.id];
            for (let i = 0; i < connectedObjects.length; i++) {
                console.log(i, connectedObjects[i]);
            }
            if (!object_socket) {
                console.log("object_socket is not present.");
                break;
            }
            startMockEmergencyHandler(object_socket);
            break;
        case 'clearData':
            clearData(data.id, data.name, ws);
            break;
        case 'deleteObject':
            deleteObject(data.id, data.name, ws);
            break;
        case 'changeObjectName':
            changeObjectName(data.name, data.new_name, ws);
            break;
        default:
            console.log('Unknown message type:', type);
    }
}

function startMockEmergencyHandler(object_socket) {
    object_socket.send(JSON.stringify({ type: "startMockEmergency" }));
}

async function measurementStartedDBOperation(object_id) {

    if (!object_id) {
        console.log("object_id cannot be empty");
        return;

    }

    let object_name = null;

    // Не возвращают промисы
    const insertRecordWithReferentialFlag = () => {
        console.log("Trying to insert with referential flag...");
        sqlcon.query(`
            insert into measurements (start_timestamp, object_id, isReferential)
            values ('${moment().format('YYYY-MM-DD HH:mm:ss')}', ${object_id}, 1)`,
            (err) => {
                if (err) throw err;
                console.log("Succesfully inserted.");
            })
    }

    const insertRecord = () => {
        sqlcon.query(`
            insert into measurements (start_timestamp, object_id, isReferential)
            values ('${moment().format('YYYY-MM-DD HH:mm:ss')}', ${object_id}, 0)`,
            (err) => {
                if (err) throw err;
            });
    }

    // Возвращают промисы
    const changeObjectStatus = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`UPDATE objects SET status = 1 WHERE id = '${object_id}'`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        })
    }

    const checkIfRecordsExist = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select count(*) as count from measurements`, (err, result) => {
                if (err) reject(err);
                resolve(result[0].count);
            })
        })
    }

    let count = await checkIfRecordsExist();

    if (!count) {
        insertRecordWithReferentialFlag();
    } else {
        insertRecord();
    }

    let result = await changeObjectStatus();
    object_name = await getObjectNameById(object_id);

    if (result) {
        connectedUsers.forEach((user, i) => {
            user.send(JSON.stringify({ type: 'startChecking', data: { name: object_name, status: 1 } }))
            getChangedObjectsHandler();
        });
    } else {
        connectedUsers.forEach((user, i) => {
            user.send(JSON.stringify({
                type: 'startChecking',
                data: {
                    name: object_name,
                    status: 0,
                    reason: "Ошибка измерения"
                }
            }));
        });
    }
}

// end_timestamp как тут нулить при отправке
function measurementFinishedDBOperation(avg_current, avg_voltage, object_id) {

    const updateMeasurements = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`update measurements set
    avg_current = ${avg_current},
    avg_voltage = ${avg_voltage},
    end_timestamp = '${moment().format('YYYY-MM-DD HH:mm:ss')}'
    where object_id = ${object_id} and end_timestamp is NULL`, (err) => {
                if (err) reject(err);
                resolve();
            })
        })
    }

    const updateObjectStatus = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`update objects set status = 0 where id = ${object_id}`, err => {
                if (err) reject(err);
                resolve();
            })
        })
    }

    updateMeasurements()
        .then(updateObjectStatus)
        .then(getChangedObjectsHandler)
        .then(() => {
            sendObjectDataChanged(object_id);
        });

}

function getObjectDataChanges(object_id) {

}

function emergencyHandler(amperage, voltage, object_id, ws) {

    let object_name = '';
    let current = null;
    let history = [];

    const insertIntoEmergency = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`insert into emergency (current, voltage, timestamp, object_id) values
      (
        ${current},
        ${voltage},
        '${moment().format('YYYY-MM-DD HH:mm:ss')}',
        ${object_id}
      )`, err => {
                if (err) reject(err);
                resolve();
            })
        })
    }

    const getObjectName = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select name from objects where id = ${object_id};`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        });
    }

    const getEmergencyData = (object_name) => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select * from emergency where object_id = ${object_id} order by timestamp asc;`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        })
    }

    const getMeasurementsData = (object_name) => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select id, avg_current as current, avg_voltage as voltage, start_timestamp, end_timestamp as timestamp, object_id from measurements where object_id = ${object_id};`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        })
    }

    const changeObjectStatus = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`update objects set status = 2 where id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        })
    }

    changeObjectStatus()
        .then(insertIntoEmergency)
        .then(getObjectName)
        .then(dbObjectName => {
            object_name = dbObjectName;
        })
        .then(getEmergencyData, object_name)
        .then(emergencies => {
            current = emergencies[0];

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

}

// Что это?
function emergencyStoppedHandler(object_id) {
    sqlcon.query(`update set status = 0 where id = ${object_id}`, (err, result) => {
        if (err) throw err;

        for (let i = 0; i < connectedUsers.length; i++) {
            connectedUsers.send(JSON.stringify({ type: 'emergencyStopped', data: { id: object_id } }));
        }
    })
}

function BRUH() {
    console.log("YOUVE ENTERED BRUH");
}

function getObjectData(object_id, name, ws) {
    let object_name = '';
    let current = null;
    let object_status = null;
    console.log(object_id);
    let history = [];

    const getObjectName = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select name from objects where id = ${object_id};`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        });
    }

    const getEmergencyData = (object_name) => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select * from emergency where object_id = ${object_id} order by timestamp asc;`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        })
    }

    const getMeasurementsData = (object_name) => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select id, avg_current as current, avg_voltage as voltage, start_timestamp, end_timestamp as timestamp, object_id from measurements where object_id = ${object_id};`, (err, result) => {
                if (err) reject(err);
                console.log(result);
                resolve(result);
            });
        })
    }

    const getObjectStatus = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select status from objects where id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result[0].status);
            })
        });
    }

    getObjectStatus()
        .then(status => {
            object_status = status;
        })
        .then(getObjectName)
        .then(name_of_object => {
            object_name = name_of_object;
        })
        .then(getEmergencyData, object_name)
        .then(emergencies => {
            if (object_status === 2) {
                current = emergencies[0] || null;
                current.timestamp = (current === null ? null : new Date(current.timestamp).getTime())

                for (let index = 1; index < emergencies.length; index++) {
                    emergencies[index]['status'] = 2;
                    emergencies[index].timestamp = (emergencies[index] === null ? null : new Date(emergencies[index].timestamp).getTime())
                    history.push(emergencies[index]);
                }
            } else {
                for (let index = 0; index < emergencies.length; index++) {
                    emergencies[index]['status'] = 2;
                    emergencies[index].timestamp = (emergencies[index] === null ? null : new Date(emergencies[index].timestamp).getTime())
                    history.push(emergencies[index]);
                }
            }
        })
        .then(getMeasurementsData, object_name)
        .then(measurements => {

            for (let index = 0; index < measurements.length; index++) {
                measurements[index]['status'] = 1;
                history.push(measurements[index]);
            }
            (current)
                ? ws.send(JSON.stringify({ type: 'getObjectData', data: { 'current': current, 'history': history.length === 0 ? null : history, name: object_name[0].name, id: object_id } }))
                : ws.send(JSON.stringify({ type: 'getObjectData', data: { 'history': history.length === 0 ? null : history, name: object_name[0].name, id: object_id } }))
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

function clearData(object_id, object_name, ws) {

    if (!object_id) {
        console.log("object_id cannot be empty");
        return;
    }

    const createArchiveDBQuery = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query("create database if not exists archive_battery", (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });
    };

    const useArchiveBatteryQuery = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query("use archive_battery", (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });
    };

    const createArchiveTablesQuery = () => {
        return new Promise((resolve, reject) => {

            const createObjectsTable = () => {
                return new Promise((resolve, reject) => {
                    sqlcon.query(`create table if not exists objects
        (
        id int,
          name text,
          status tinyint
        )`, (err, result) => {
                        if (err) reject(err);
                        console.log("CREATEOBJECTSTABLE WORKED WELL");
                        resolve(result);
                    })
                })
            }

            const createArchiveMeasurementsTable = () => {
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

            const createArchiveEmergencyTable = () => {
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

            createObjectsTable()
                .then(createArchiveMeasurementsTable)
                .then(createArchiveEmergencyTable)
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    console.log(err);
                    reject(err);
                })
        });
    };

    const dumpMeasurementRecords = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`insert into archive_battery.measurements select * from battery.measurements where object_id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        })
    }

    const dumpEmergencyRecords = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`insert into archive_battery.emergency select * from battery.emergency where object_id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        })
    }

    const resetMeasurementRecords = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`delete from measurements where object_id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        })
    }

    const resetEmergencyRecords = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`delete from emergency where object_id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        })
    }

    return new Promise((resolve, reject) => {
        createArchiveDBQuery()
            .then(useArchiveBatteryQuery)
            .then(createArchiveTablesQuery)
            .then(() => {
                console.log("Archive DB is ready...");
            })
            .then(useBatteryQuery)
            .then(result => {
                console.log("REUSLT ", result);
            })
            .then(dumpMeasurementRecords)
            .then(dumpEmergencyRecords)
            .then(resetMeasurementRecords)
            .then(resetEmergencyRecords)
            .then(resetEmergencyRecords)
            .then(() => {
                if (ws)
                    ws.send(JSON.stringify({ type: 'clearData', data: { name: object_name, 'status': true } }));
                resolve("OK");
            })
            .catch(err => {
                console.log(err);
                if (ws)
                    ws.send(JSON.stringify({ type: 'clearData', data: { name: object_name, 'status': false, 'reason': err } }));
            });
    })
}

function deleteObject(object_id, object_name, ws) {

    console.log("OBJECT_ID", object_id);
    console.log("OBJECT_IDTYPEOF", typeof object_id);

    const useBatteryQuery = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`use battery`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        });
    }

    const addObjectToArchiveDB = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`INSERT INTO archive_battery.objects SELECT * FROM battery.objects WHERE id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        });
    }

    const deleteObjectFromDB = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`DELETE FROM objects WHERE id = ${object_id}`, (err, result) => {
                if (err) {
                    ws.send(JSON.stringify({ type: 'deleteObject', data: { 'status': false, name: object_name, 'reason': err.message } }));
                    throw err;
                }
                ws.send(JSON.stringify({ type: 'deleteObject', data: { name: object_name, 'status': true } }));
            })
        })
    }

    useBatteryQuery()
        .then(addObjectToArchiveDB)
        .then(() => {
            clearData(object_id, object_name, ws);
        })
        .then(deleteObjectFromDB);
}

function changeObjectName(object_name, new_name, ws) {
    sqlcon.query(`UPDATE objects SET name = '${new_name}' WHERE name = '${object_name}'`, (err, result) => {
        if (err) {
            ws.send(JSON.stringify({ type: 'changeObjectName', data: { 'status': false, 'reason': err.message } }));
            throw err;
        }
        ws.send(JSON.stringify({ type: 'changeObjectName', data: { 'status': true } }));
    })
}

function startChecking(object_id, object_socket) {
    if (!object_id) {
        console.log("object_id cannot be empty");
        return;
    }
    object_socket.send(JSON.stringify({ type: "executePlannedMeasurement" }));

    // wss.clients.forEach((client) => {
    //   client.send(JSON.stringify({ type: "executePlannedMeasurement" }));
    // })
}

async function getObjectsHandler(ws) {

    let objects = [];

    const BRUH123 = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`SELECT id, name, status
                              FROM objects`, (err, result) => {
                if (err) reject(err);
                resolve(result);
                // ws.send(JSON.stringify({ type: 'getObjects', data: result }));
            });
        })
    }

    const getLatestMeasurementTimestamp = (object_id) => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select start_timestamp as timestamp from measurements where object_id = ${object_id} order by timestamp desc`, (err, result) => {
                if (err) reject(err);
                resolve(new Date(result[0].timestamp).getTime());
            })
        })
    }

    const getLatestEmergencyTimestamp = (object_id) => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`select timestamp from emergency where object_id = ${object_id} order by timestamp desc`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        })
    }

    BRUH123()
        .then(result => {
            return new Promise(async (response, reject) => {
                console.log(result);
                for (let index = 0; index < result.length; index++) {
                    let currentObject = result[index];
                    if (currentObject.status === 1) {
                        let localObject = currentObject;
                        localObject.timestamp = await getLatestMeasurementTimestamp(currentObject.id);
                        localObject.timestamp = new Date(localObject.timestamp).getTime();
                        objects.push(localObject);
                    }
                    else if (currentObject.status === 2) {
                        let localObject = currentObject;
                        localObject.timestamp = await getLatestEmergencyTimestamp(currentObject.id);
                        localObject.timestamp = new Date(localObject.timestamp[0].timestamp).getTime();
                        objects.push(localObject);
                    }
                    else {
                        let localObject = currentObject;
                        objects.push(localObject);
                    }
                }
                response("OK");
            })
        })
        .then(() => {
            for (let i = 0; i < connectedUsers.length; i++) {
                connectedUsers[i].send(JSON.stringify({ type: "getObjects", data: objects }));
            }
        })
}

async function sendObjectDataChanged(object_parameter) {
    let object_name = null;
    if (typeof object_parameter === 'number') {
        object_name = await getObjectNameById(object_parameter);
        console.log("TYPEOF ", typeof object_parameter);
    } else if (typeof object_parameter === 'string') {
        object_name = object_parameter;
        console.log("TYPEOF ", typeof object_parameter);
    }
    console.log("TYPEOFGENERAL ", typeof object_parameter);
    console.log("OBJECT_PARAMETER ", typeof object_parameter);

    connectedUsers.forEach(user => {
        user.send(JSON.stringify({ type: "objectDataChanges", data: { name: object_name } }));
    })
}

async function getChangedObjectsHandler() {

    // let objects = null;

    const getObjectStatus = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`SELECT status FROM objects WHERE id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result[0].status);
            })
        });
    }
    const getLatestMeasurementTimestamp = (object_id) => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`SELECT start_timestamp FROM measurements WHERE object_id = ${object_id} order by start_timestamp desc`, (err, result) => {
                if (err) reject(err);
                resolve(result[0].start_timestamp);
            })
        });
    }
    const getLatestEmergencyTimestamp = (object_id) => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`SELECT timestamp FROM emergency WHERE object_id = ${object_id} order by timestamp desc`, (err, result) => {
                if (err) reject(err);
                resolve(result[0].timestamp);
            })
        });
    }

    const getData = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`SELECT id, name, status FROM objects`,
                (err, result) => {
                    if (err) reject(err);
                    resolve(result);
                });
        });
    }
    // Что это?
    // const processObjects = (objects) => {
    //     return new Promise((resolve, reject) => {
    //         for (let i = 0; i < objects.length; i++) {
    //             localObjects.push(objects[i]);
    //             if (localObjects[i].status === 1) {
    //                 let localObjects = [];
    //                 getLatestMeasurementTimestamp(localObjects[i].id)
    //                     .then(start_timestamp => {
    //                         localObjects[i]['timestamp'] = start_timestamp;
    //                         console.log("PROCESSLOCALOBJECTS", localObjects);
    //                     })
    //             }
    //         }
    //     })
    // }

    let objects = await getData();
    let objectsPlus = [];

    for (let index = 0; index < objects.length; index++) {
        let currentObject = objects[index];
        if (currentObject.status === 1) {
            let localObject = currentObject;
            localObject.timestamp = await getLatestMeasurementTimestamp(currentObject.id);
            localObject.timestamp = new Date(localObject.timestamp).getTime();
            objectsPlus.push(localObject);
        }
        else if (currentObject.status === 2) {
            let localObject = currentObject;
            localObject.timestamp = await getLatestEmergencyTimestamp(currentObject.id);
            localObject.timestamp = new Date(localObject.timestamp).getTime();
            objectsPlus.push(localObject);
        }
        else {
            let localObject = currentObject;
            objectsPlus.push(localObject);
        }
    }

    for (let i = 0; i < connectedUsers.length; i++) {
        console.log(i, "OBJECTCHANGES");
        connectedUsers[i].send(JSON.stringify({ type: 'objectsChanges', data: objectsPlus }))
    }

    // // Надо, чтобы возвращало результат
    // processObjects(objects)
    //     .then(localObjects => {
    //         console.log("OBJECTS", localObjects);
    //         for (let i = 0; i < connectedUsers.length; i++) {
    //             connectedUsers[i].send(JSON.stringify({ type: 'objectsChanges', data: localObjects }))
    //         }
    //     })
}

function getObjectIdByName(name) {
    return new Promise((resolve, reject) => {
        sqlcon.query(`select id as object_id from objects where name = '${name}'`, (err, result) => {
            if (err) reject(err);
            console.log("GETOBJECTIDBYNAME", result);
            console.log("GETOBJECTIDBYNAME")
            resolve(result[0].object_id);
        })
    })
}

function getObjectNameById(object_id) {
    return new Promise((resolve, reject) => {
        sqlcon.query(`select name from objects where id = ${object_id}`, (err, result) => {
            if (err) reject(err);
            console.log("GETOBJECTNAMEBYID", result);
            resolve(result[0].name);
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

const SQLConnectQuery = () => {
    return new Promise((resolve, reject) => {
        sqlcon.connect((err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

const createDBQuery = () => {
    return new Promise((resolve, reject) => {
        sqlcon.query("create database if not exists battery", (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

const useBatteryQuery = () => {
    return new Promise((resolve, reject) => {
        sqlcon.query("use battery", (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

const createTablesQuery = () => {
    return new Promise((resolve, reject) => {

        const createObjectsTable = () => {
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

        const createMeasurementsTable = () => {
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

        const createEmergencyTable = () => {
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
