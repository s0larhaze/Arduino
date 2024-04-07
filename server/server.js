"use strict";

const bodyParser = require('body-parser');
const express    = require('express');
const serial     = require('serialport');
const moment     = require('moment');
const mysql      = require('mysql');
const cors       = require('cors');
const path       = require('path');
const uuid       = require('uuid');

const WebSocket = require('ws');

const { ReadlineParser } = require('@serialport/parser-readline');
const { createServer }   = require('node:http');

const app    = express();
const server = createServer(app);

const wss = new WebSocket.Server({ server });

let connectedObjects = {};
let connectedUsers   = [];

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

function handleMessage(message, ws) {
    let message_json = null;
    let object_id    = null;
    let type         = null;
    let data         = null;
    try {
        message_json = JSON.parse(message);
        type         = message_json.type;
        data         = message_json.data;
        object_id    = data.id;
        object_name  = data.name;
    } catch {
        console.log("No reasonable message.");
    }

    console.log("MESSAGE_JSON", message_json);

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
        case 'getObjects':
            getObjectsHandler(ws);
            break;
        case 'getObjectData':
            const name = data.name;
            const id   = data.id;

            getObjectData(id, name, ws);
            break;
        // Что это?
        case 'getCurrentObjectRegistrationSocket':
        ws.send(JSON.stringify({
                type: "getCurrentObjectRegistrationSocket",
                data: {
                    objectSocket: connectedObjects.get(object_id)
                }
            }));
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
        case 'getObjectMeasurementData':
            getObjectMeasurementDataHandler(object_id, ws);
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
// Клиент

// Регистрирует пользователей и инициализирует их обработку
function userObjectRegistration(ws) {
    connectedUsers.push(ws);
    getObjectsHandler(ws);
}

// Возвращает список объектов
async function getObjectsHandler(ws, type = "getObjects") {
    const objects = [];
    const selectObjects = `SELECT id, name, status, timestamp FROM objects`;

    const result = await executeQuery(selectObjects);
    result.forEach((item, i) => {
        if (item.timestamp) {
            item.timestamp = new Date(item.timestamp).getTime();
        }
    });

    connectedUsers.forEach((item, i) => {
        item.send(JSON.stringify({ type: type, data: result }));
    });
}

// Возвращает данные по объекту
async function getObjectData(id, name, ws) {
    let current       = null;
    let history       = [];

    let object_status = null;

    async function getEmergencyData(id) {
        const sql = `SELECT * FROM emergency WHERE object_id = ? ORDER BY timestamp asc`;
        const result = await executeQuery(sql, [id]);
        return result;
    }

    async function getMeasurementsData(id) {
        const sql = `SELECT id, avg_current as current, avg_voltage as voltage, start_timestamp, end_timestamp as timestamp, object_id, isReferential FROM measurements WHERE object_id = ?`;
        const result = await executeQuery(sql, [id]);
        return result;
    }

    async function getObjectStatus(id) {
        const sql = `SELECT status FROM objects WHERE id = ?`;
        const result = await executeQuery(sql, [id]);
        return result[0].status;

    }

    object_status = await getObjectStatus(id);

    const emergencies  = await getEmergencyData(id);
    const measurements = await getMeasurementsData(id);

    // добавляем тревоги в историю
    emergencies.forEach((item, i) => {
        item['status'] = 2;
        item.timestamp = new Date(item.timestamp).getTime();
        history.push(item);
    });

    if (object_status === 2) current = history.shift();

    // Добавляем измерения в историю
    measurements.forEach((item, i) => {
        item['status'] = 1;
        history.push(item);
    });

    let response = {};
        response.type = 'getObjectData';
        response.data = {
            history: history,
            name: name,
            id: id,
        };
    // Если есть данные по текущей сработке
    if (current) response.data['current'] = current;

    ws.send(JSON.stringify(response));
}

// Очищаем данные по объекту
async function clearData(id, name, ws) {
    if (!id) {
        console.log("object_id cannot be empty");
        return;
    }

    try {
        async function createArchiveDBQuery() {
            const sql = "CREATE DATABASE IF NOT EXISTS archive_battery";
            const result = await executeQuery(sql);
            return result;
        };
        async function createArchiveTablesQuery() {
            const createObjectsTable = `CREATE TABLE IF NOT EXISTS objects (
                id int, name text, status tinyint
            )`;
            const createArchiveMeasurementsTable = `CREATE TABLE IF NOT EXISTS measurements (
                id int,
                avg_current float,
                avg_voltage float,
                start_timestamp timestamp,
                end_timestamp timestamp,
                object_id int,
                isReferential boolean
            )`;
            const createArchiveEmergencyTable = `CREATE TABLE IF NOT EXISTS emergency (
                id int,
                current float,
                voltage float,
                timestamp timestamp,
                object_id int
            )`;

            await executeQuery(createObjectsTable, [], 'archive_battery');
            await executeQuery(createArchiveMeasurementsTable, [], 'archive_battery');
            await executeQuery(createArchiveEmergencyTable, [], 'archive_battery');
        }
        async function dumpArchiveTablesQuery() {
            // const dumpObjectRecords = `INSERT INTO archive_battery.objects SELECT * from battery.objects WHERE id = ?`;
            const dumpMeasurementRecords = `INSERT INTO archive_battery.measurements SELECT * from battery.measurements WHERE object_id = ?`;
            const dumpEmergencyRecords = `INSERT INTO archive_battery.emergency SELECT * from battery.emergency WHERE object_id = ?`;

            // await executeQuery(dumpObjectRecords, [id], null);
            await executeQuery(dumpMeasurementRecords, [id], null);
            await executeQuery(dumpEmergencyRecords, [id], null);
        }
        async function resetBatteryTablesQuery() {
            // const resetObjectRecord = `DELETE FROM objects WHERE id = ?`;
            const resetMeasurementRecords = `DELETE FROM measurements WHERE object_id = ?`;
            const resetEmergencyRecords = `DELETE FROM emergency WHERE object_id = ?`;

            // await executeQuery(resetObjectRecord, [id]);
            await executeQuery(resetMeasurementRecords, [id]);
            await executeQuery(resetEmergencyRecords, [id]);
        }

        await createArchiveDBQuery();
        await createArchiveTablesQuery();
        await dumpArchiveTablesQuery();
        await resetBatteryTablesQuery();

        if (ws) {
            ws.send(JSON.stringify({
                type: 'clearData',
                data: {
                    id: id,
                    name: name,
                    status: true,
                }
            }));
        }
    } catch (e) {
        console.log(e);
        if (ws) {
            ws.send(JSON.stringify({
                type: 'clearData',
                 data: {
                    id: id,
                    name: name,
                    status: false,
                    reason: e
                }
            }));
        }
    }
}

// Ардуино
// Эту функцию можно переписать на асинхронный вариант
function objectRegistrationHandler(object_id, ws) {
    if (!object_id) {
        console.log("object_id cannot be empty, undefined or null");
        return;
    }

    async function checkIfObjectPresentInDB() {
        const sql = `SELECT COUNT (*) as count FROM objects WHERE id = ?`
        const result = await executeQuery(sql, [object_id]);

        return result[0].count;
    }

    async function createObjectInDB() {
        const sql = `
        INSERT INTO objects (id, name, status)
        VALUES (?, '? объект', 0)`;
        const result = await executeQuery(sql, [object_id, object_id]);
        console.log(result);
    }

    const count = checkIfObjectPresentInDB();
    if (!count) createObjectInDB();
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

    async function insertRecord(refFlag) {
        const sql = `
            INSERT INTO measurements (start_timestamp, object_id, isReferential)
            VALUES ('?', ?, ?)`;
        await executeQuery(sql, [moment().format('YYYY-MM-DD HH:mm:ss'), object_id, refFlag]);
    }

    async function checkIfRecordsExist() {
        const sql = `SELECT COUNT(*) as count FROM measurements`;
        const result = await executeQuery(sql);
        return result[0].count;
    }

    async function changeObjectStatus(object_id) {
        try {
            const sql = `UPDATE objects SET status = 1 WHERE id = '?'`;
            const result = await executeQuery(sql, object_id);
            return true;
        } catch (e) {
            return false;
            console.log(e);
        }
    }

    insertRecord(checkIfRecordsExist() % 2);

    let result = await changeObjectStatus(object_id);
    object_name = await getObjectNameById(object_id);

    if (result) {
        connectedUsers.forEach((user, i) => {
            user.send(JSON.stringify({
                type: 'startChecking',
                data: {
                    name: object_name,
                    id: object_id,
                    status: 1,
                }
            }));
            getChangedObjectsHandler();
        });
    } else {
        connectedUsers.forEach((user, i) => {
            user.send(JSON.stringify({
                type: 'startChecking',
                data: {
                    name: object_name,
                    id: object_id,
                    status: 0,
                    reason: "Ошибка измерения",
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
        .then(updateObjectStatus);
    // .then(getChangedObjectsHandler);
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

    const chageObjectStatus = () => {
        return new Promise((resolve, reject) => {
            sqlcon.query(`update objects set status = 2 where id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result);
            })
        })
    }

    chageObjectStatus()
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


// Получаем данные по измерениям и отправляем их клиенту?
async function getObjectMeasurementDataHandler(object_id, ws) {
    if (object_id === '') {
        console.log("object_id cannot be empty");
        return;
    }

    try {
        const sql = `SELECT * FROM measurements WHERE object_id = ?`;
        const results = await executeQuery(sql, [object_id]);
        ws.send(JSON.stringify({ type: 'getObjectMeasurementData', data: results }));
    } catch (error) {
        console.error(error);
    }
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
            sqlcon.query(`SELECT start_timestamp FROM measurements WHERE object_id = ${object_id}`, (err, result) => {
                if (err) reject(err);
                resolve(result[0].start_timestamp);
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


    for (let i = 0; i < connectedUsers.length; i++) {
        console.log(i, "OBJECTCHANGES");
        connectedUsers[i].send(JSON.stringify({ type: 'objectsChanges', data: objects }))
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

async function getObjectIdByName(name) {
    const sql = `SELECT id as object_id FROM objects WHERE name = ?`;

    return await executeQuery(sql, [name])[0].object_id;
}

async function getObjectNameById(object_id) {
    const sql = `SELECT name FROM objects WHERE id = ?`;

    return await executeQuery(sql, [object_id])[0].name;
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

// Создаем пул соединений
const pool = mysql.createPool({
    connectionLimit: 10, // Максимальное количество соединений в пуле
    host: "localhost",
    user: "root",
    password: "root",
    port: 3306, // Указываем порт (если отличается от стандартного)
    multipleStatements: true // Разрешаем выполнение нескольких SQL-запросов в одном вызове
});

// Функция для выполнения запросов к базе данных
function executeQuery(sql, values = [], database = 'battery') {
    return new Promise((resolve, reject) => {
        // Получаем соединение из пула
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err);
                return;
            }

            // Подключаемся к указанной базе данных, если не указано иное
            if (database) {
                connection.changeUser({ database }, (error) => {
                    if (error) {
                        connection.release(); // Освобождаем соединение обратно в пул
                        reject(error);
                        return;
                    }

                    // Выполняем запрос
                    connection.query(sql, values, (error, results, fields) => {
                        // Освобождаем соединение обратно в пул
                        connection.release();

                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    });
                });
            } else {
                // если указано иное
                connection.query(sql, values, (error, results, fields) => {
                    // Освобождаем соединение обратно в пул
                    connection.release();

                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            }
        });
    });
}

// Функция для создания базы данных (если не существует)
async function createDBQuery() {
    const sql = "CREATE DATABASE IF NOT EXISTS battery";
    try {
        await executeQuery(sql, [], null);
        console.log("Database created or already exists");
    } catch (error) {
        console.error("Error creating database:", error);
        throw error;
    }
}

// Функция для выбора базы данных
async function useBatteryQuery() {
    const sql = "USE battery";
    try {
        await executeQuery(sql);
        console.log("Using battery database");
    } catch (error) {
        console.error("Error selecting database:", error);
        throw error;
    }
}

// Функция для создания таблиц
async function createTablesQuery() {
    const createObjectsTableQuery = `
        CREATE TABLE IF NOT EXISTS objects (
            id INT PRIMARY KEY,
            name TEXT,
            status TINYINT,
            timestamp TIMESTAMP NULL DEFAULT NULL
        )`;

    const createMeasurementsTableQuery = `
        CREATE TABLE IF NOT EXISTS measurements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            avg_current FLOAT,
            avg_voltage FLOAT,
            start_timestamp TIMESTAMP,
            end_timestamp TIMESTAMP,
            object_id INT,
            isReferential BOOLEAN
        )`;

    const createEmergencyTableQuery = `
        CREATE TABLE IF NOT EXISTS emergency (
            id INT AUTO_INCREMENT PRIMARY KEY,
            current FLOAT,
            voltage FLOAT,
            timestamp TIMESTAMP,
            object_id INT
        )`;

    try {
        await executeQuery(createObjectsTableQuery);
        await executeQuery(createMeasurementsTableQuery);
        await executeQuery(createEmergencyTableQuery);
        console.log("Tables created or already exist");
    } catch (error) {
        console.error("Error creating tables:", error);
        throw error;
    }
}

// Выполнение всех запросов
async function setupDatabase() {
    try {
        await createDBQuery();
        await useBatteryQuery();
        await createTablesQuery();
        console.log("All DB setups have been finished successfully!");
    } catch (error) {
        console.error("Error setting up database:", error);
    }
}

// Вызов функции для установки базы данных
setupDatabase();

// END DB SETUP

app.get("/", (req, res) => {
    console.log(`User ${req.ip} has connected to the root.`);

    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(3000, () => {
    console.log("Server is running...");
});
