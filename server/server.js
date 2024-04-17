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
const { log } = require('console');

const app    = express();
const server = createServer(app);

const wss = new WebSocket.Server({ server });

let connectedUsers   = [];
let unactiveObjects  = [];
let connectedObjects = {};


app.use(express.json());
app.use("/socket", express.static('socket'))
app.use(cors({
    allowedHeaders: ['Content-Type']
}))

// Имитация бурной деятельности
const imitationOfVigorousActivity = {
    arduinoObjectRegistration: JSON.stringify({
        type: "arduinoObjectRegistration",
        data: {id: new Date().getTime() % 1000}
    }),
    arduinoStartedMeasurement: JSON.stringify({
        type: "arduinoStartedMeasurement",
        data: {id: 9}
    }),
    arduinoFinishedMeasurement: JSON.stringify({
        type: "arduinoFinishedMeasurement",
        data: {avg_current: 4.2, avg_voltage: 11.9, id: 9}
    }),
    arduinoEmergency: JSON.stringify({
        type: "arduinoEmergency",
        data: {current: 0.6, voltage: 11.9, id: 1}
    }),
    arduinoEmergencyStopped: JSON.stringify({
        type: "arduinoEmergencyStopped",
        data: {id: 1}
    }),
}

let interval = null;

setInterval(async () => {
    unactiveObjects.forEach((item, i) => {
        delete connectedObjects[item];
    });

    const result = await checkObjects();
    result.forEach((item, i) => {
        let f = false;
        let id = item.id;
        for (let key in connectedObjects) {
            if (key === item.id) {
                f = true;
                connectedObjects[key].send(JSON.stringify({type: "isActive", data: null}));
                unactiveObjects.push(key);
            }
        }
        if (!f) {
            changeObject(id);
            getObjectsHandler(null, "objectsChanges");
        }
    });
}, 300000);


async function checkObjects() {
    const sql = `SELECT id, status FROM objects`;
    const result = await executeQuery(sql);

    return result;
}
async function changeObject(id) {
    const sql = `UPDATE objects SET status = -1 WHERE id = ?`;
    await executeQuery(sql, [id]);
}

// Сокет
wss.on('connection', (socket) => {
    console.log("Подключение!");

    socket.onmessage = (event) => {
        handleMessage(event.data, socket);
    };

    // Имитация бурной деятельности
    // socket.onmessage({data: imitationOfVigorousActivity.arduinoEmergency});

    // interval = setInterval(() => {
    //     socket.onmessage({data: imitationOfVigorousActivity.arduinoEmergency});
    // }, 1200000);
    // setTimeout(() => {
    //     clearInterval(interval);
    //     socket.onmessage({data: imitationOfVigorousActivity.arduinoEmergencyStopped});
    // }, 0);

    socket.onclose = () => {
        console.log('Подключение закрыто');
        connectedUsers.forEach((item, i) => {
            if (item === socket) {
                connectedUsers.splice(i, 1);
                console.log("user wish id: " + i + " was disconected");
            }
        });
        for (let key in connectedObjects) {
            if (connectedObjects[key] === socket) {
                connectedObjects[key].splice(i, 1);
                console.log("object wish id: " + key + " was disconected");
            }
        }
    };

    socket.onerror = () => {
        console.log("socket error: ", socket);
    }
})

// Обработка сообщений сокета
function handleMessage(message, ws) {
    let object_socket = null;
    let message_json  = null;
    let object_name   = null;
    let object_id     = null;
    let type          = null;
    let data          = null;

    try {
        message_json = JSON.parse(message);
        type         = message_json.type;
        data         = message_json.data;
        if (data) {
            object_id    = data.id;
            object_name  = data.name;
        }
    } catch (e) {
        console.log("Сообщение не пришло.", e, message);
    }
    console.log('message_json', message_json);

    switch (type) {
        // От Ардуино
        case 'arduinoObjectRegistration':
            objectRegistrationHandler(object_id, ws);
            break;
        case 'isActive':
            let index = unactiveObjects.indexOf(key);
            if (index >= 0) {
                unactiveObjects.splice(index, 1);
            }

            break;
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

        // От Клиента
        case 'userRegistration':
            userRegistration(ws);
            break;
        case 'getObjects':
            getObjectsHandler(ws);
            break;
        case 'getObjectData':
            const name = data.name;
            const id   = data.id;

            getObjectData(id, name, ws);
            break;
        case 'clearData':
            clearData(data.id, data.name, ws);
            break;
        case 'deleteObject':
            deleteObject(data.id, data.name, ws);
            break;
        case 'changeObjectName':
            changeObjectName(data.id, data.name, data.new_name, ws);
            break;
        case 'startChecking':
            object_socket = connectedObjects[data.id];

            if (!object_socket) {
                ws.send(JSON.stringify({
                    type: 'startChecking',
                    data: {
                        id: object_id,
                        name: object_name,
                        status: 0,
                        reason: "Объект недоступен",
                    }
                }));
                break;
            }

            startChecking(data.id, object_socket);
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

        default:
            console.log('Unknown message type:', type);
    }
}
// Клиент

// Регистрирует пользователей и инициализирует их обработку
function userRegistration(ws) {
    connectedUsers.push(ws);
    getObjectsHandler(ws);
}

// Возвращает список объектов
async function getObjectsHandler(ws = null, type = "getObjects") {
    const objects = [];

    async function selectObjects() {
        const selectObjects = `SELECT id, name, status, timestamp FROM objects`;
        try {
            const result = await executeQuery(selectObjects);
            return result;
        } catch (e) {
            console.log(e);
            throw {message: "Ошибка при получении объектов", data: {error: e, type: type}}
        }
    }

    try {
        const result = await selectObjects();
        result.forEach((item, i) => {
            if (item.timestamp) {
                item.timestamp = new Date(item.timestamp).getTime();
            }
        });

        connectedUsers.forEach((item, i) => {
            item.send(JSON.stringify({ type: type, data: result }));
        });
    } catch (e) {
        console.log(e.message, e.data);
    }
}

// Возвращает данные по объекту
async function getObjectData(id, name, ws) {
    let current       = null;
    let history       = [];

    async function getEmergencyData(id) {
        const sql = `SELECT * FROM emergency WHERE object_id = ? ORDER BY timestamp asc`;
        try {
            const result = await executeQuery(sql, [id]);
            return result;
        } catch (e) {
            throw {message: "Не удалось получить тревоги", data: {erroe: e, id: id}}
        }
    }

    async function getMeasurementsData(id) {
        const sql = `SELECT id, avg_current as current, avg_voltage as voltage, start_timestamp, end_timestamp as timestamp, object_id, isReferential FROM measurements WHERE object_id = ?`;
        try {
            const result = await executeQuery(sql, [id]);
            return result;
        } catch (e) {
            throw {message: "Не удалось получить измерения", data: {erroe: e, id: id}}
        }
    }

    async function getObjectStatus(id) {
        const sql = `SELECT status FROM objects WHERE id = ?`;
        try {
            const result = await executeQuery(sql, [id]);
            return result[0].status;
        } catch (e) {
            throw {message: "Не удалось получить статус объекта", data: {error: e, id: id}}
        }
    }
    try {
        const object_status = await getObjectStatus(id);
        const measurements  = await getMeasurementsData(id);
        const emergencies   = await getEmergencyData(id);

        // добавляем тревоги в историю
        emergencies.forEach((item, i) => {
            item['status'] = 2;
            item.timestamp = new Date(item.timestamp).getTime();
            history.push(item);
        });

        if (object_status === 2) current = history.pop();

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
    } catch (e) {
        console.log(e.message, e.data);
    }
}

// Очищаем данные по объекту
async function clearData(id, name, ws) {
    if (!id) {
        console.log("object_id cannot be empty");
        return;
    }

    async function createArchiveDBQuery() {
        const sql = "CREATE DATABASE IF NOT EXISTS archive_battery";
        try {
            const result = await executeQuery(sql);
            return result;
        } catch (e) {
            throw {message: "Не удалось создать архивную бд", data: {error: e}}
        }
    };
    async function createArchiveTablesQuery() {
        const createObjectsTable = `
        CREATE TABLE IF NOT EXISTS objects (id int, name text, status tinyint)
        `;
        const createArchiveMeasurementsTable = `
        CREATE TABLE IF NOT EXISTS measurements (
            id int,
            avg_current float,
            avg_voltage float,
            start_timestamp timestamp,
            end_timestamp timestamp,
            object_id int,
            isReferential boolean
        )
        `;
        const createArchiveEmergencyTable = `
        CREATE TABLE IF NOT EXISTS emergency (
            id int,
            current float,
            voltage float,
            timestamp timestamp,
            object_id int
        )
        `;

        try {
            await executeQuery(createObjectsTable, [], 'archive_battery');
            await executeQuery(createArchiveMeasurementsTable, [], 'archive_battery');
            await executeQuery(createArchiveEmergencyTable, [], 'archive_battery');

        } catch (e) {
            throw {message: "Не удалось создать архивную бд", data: {error: e}}
        }
    }
    async function dumpArchiveTablesQuery() {
        const dumpMeasurementRecords = `
        INSERT INTO archive_battery.measurements SELECT * from battery.measurements WHERE object_id = ?
        `;
        const dumpEmergencyRecords = `
        INSERT INTO archive_battery.emergency SELECT * from battery.emergency WHERE object_id = ?
        `;
        try {
            await executeQuery(dumpMeasurementRecords, [id], null);
            await executeQuery(dumpEmergencyRecords, [id], null);
        } catch (e) {
            throw {message: "Не удалось сохранить данные в архив", data: {error: e}}
        }
    }
    async function resetBatteryTablesQuery() {
        const resetMeasurementRecords = `DELETE FROM measurements WHERE object_id = ?`;
        const resetEmergencyRecords = `DELETE FROM emergency WHERE object_id = ?`;
        try {
            await executeQuery(resetMeasurementRecords, [id]);
            await executeQuery(resetEmergencyRecords, [id]);
        } catch (e) {
            throw {message: "Не удалось очистить данные", data: {error: e}}
        }
    }

    try {
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
        console.log(e.message, e.data);
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

// Удаляет объект из списка
async function deleteObject(id, name, ws) {
    async function dumpObjectQuery(id) {
        const dumpObjectRecords = `INSERT INTO archive_battery.objects SELECT id, name, status from battery.objects WHERE id = ?`;
        try {
            await executeQuery(dumpObjectRecords, [id], null);
        } catch (e) {
            throw {message: "Не удалось сохранить объект", data: {error: e}}
        }
    }
    async function resetObjectQuery(id) {
        const resetObjectRecord = `DELETE FROM objects WHERE id = ?`;
        try {
            await executeQuery(resetObjectRecord, [id]);
        } catch (e) {
            throw {message: "Не удалось удалить объект", data: {error: e}}
        }
    }

    try {
        await clearData(id, name, ws);
        await dumpObjectQuery(id);
        await resetObjectQuery(id);

        ws.send(JSON.stringify({
            type: 'deleteObject',
            data: {
                id: id,
                name: name,
                status: true,
            }
        }));
    } catch (e) {
        console.log(e.message, e.data);
        ws.send(JSON.stringify({
            type: 'deleteObject',
            data: {
                id: id,
                name: name,
                status: false,
                reason: e.message,
            }
        }));
    }
}

// Меняет имя указанного объекта на новое
async function changeObjectName(id, name, new_name, ws) {
    try {
        const sql = `UPDATE objects SET name = ? WHERE id = ?`;
        await executeQuery(sql, [new_name, id]);
        ws.send(JSON.stringify({
            type: 'changeObjectName',
            data: {
                id: id,
                oldName: name,
                newName: new_name,
                status: true,
            }
        }));
    } catch (e) {
        ws.send(JSON.stringify({
            type: 'changeObjectName',
            data: {
                id: id,
                status: false,
                reason: "Имя должно быть уникальным",
            }
        }));
    }
}

// Ардуино

// Регистрация объектов
async function objectRegistrationHandler(object_id, ws) {
    if (!object_id) {
        console.log("object_id cannot be empty, undefined or null");
        return;
    }

    async function checkIfObjectPresentInDB() {
        const sql = `SELECT COUNT(*) as count FROM objects WHERE id = ?`
        const result = await executeQuery(sql, [object_id]);

        return result[0].count;
    }

    async function createObjectInDB() {
        const sql = `
        INSERT INTO objects (id, name, status)
        VALUES (?, '? объект', 0)`;
        await executeQuery(sql, [object_id, object_id]);
    }

    const count = await checkIfObjectPresentInDB();
    if (!count) createObjectInDB();
    connectedObjects[object_id] = ws;
}

// Запускает проверку на ардуино
function startChecking(object_id, object_socket) {
    if (!object_id) {
        console.log("object_id cannot be empty");
        return;
    }
    object_socket.send(JSON.stringify({ type: "executePlannedMeasurement" }));
}

// Ответ на начало измерений
// Можно перевести с броткаст на точечный ответ
async function measurementStartedDBOperation(object_id, socket = null) {
    console.log("start mes");
    if (!object_id) {
        console.log("id пуст");
        return;
    }

    async function insertRecord(refFlag) {
        const sql = `
            INSERT INTO measurements (start_timestamp, object_id, isReferential)
            VALUES (?, ?, ?)`;
        try {
            await executeQuery(sql, [moment().format('YYYY-MM-DD HH:mm:ss'), object_id, refFlag]);
        } catch (e) {
            throw {message: "Не удалось создать запись", data: {error: e}}
        } finally {

        }
    }
    async function checkIfRecordsExist() {
        const sql = `SELECT COUNT(*) as count FROM measurements`;
        const result = await executeQuery(sql);
        return result[0].count;
    }
    async function changeObjectStatus(object_id) {
        const sql = `UPDATE objects SET status = 1, timestamp = ? WHERE id = '?'`;
        try {
            await executeQuery(sql, [moment().format('YYYY-MM-DD HH:mm:ss'), object_id]);
        } catch (e) {
            throw {message: "Не удалось обновить статус", data: {error: e}}
        }
    }

    try {
        let object_name = null;

        const reqEx = await checkIfRecordsExist();
        await insertRecord(+!reqEx % 2);
        await changeObjectStatus(object_id);

        object_name = await getObjectNameById(object_id);

        connectedUsers.forEach((user, i) => {
            user.send(JSON.stringify({
                type: 'startChecking',
                data: {
                    name: object_name,
                    id: object_id,
                    status: 1,
                }
            }));
        });
        getChangedObjectsHandler();
    } catch (e) {
        console.log(e.message, e.data);
        connectedUsers.forEach((user, i) => {
            user.send(JSON.stringify({
                type: 'startChecking',
                data: {
                    id: object_id,
                    status: 0,
                    reason: e.message,
                }
            }));
        });
    }
}

// Сообщение о конце проверки
async function measurementFinishedDBOperation(avg_current, avg_voltage, object_id) {
    async function updateMeasurements() {
        const sql = `UPDATE measurements SET
                    avg_current = ?,
                    avg_voltage = ?,
                    end_timestamp = ?
                    WHERE object_id = ? AND end_timestamp is NULL`;
        try {
            await executeQuery(sql, [avg_current, avg_voltage, moment().format('YYYY-MM-DD HH:mm:ss'), object_id]);
        } catch (e) {
            throw {message: "Не удалось изменить данные по измерениям", data: {error: e}}
        }
    }
    async function updateObjectStatus() {
        const sql = `UPDATE objects SET status = 0, timestamp = null WHERE id = ?`;
        try {
            await executeQuery(sql, [object_id]);
        } catch (e) {
            throw {message: "Не удалось обновить статус объекта", data: {error: e}}
        }
    }

    try {
        await updateMeasurements();
        await updateObjectStatus();

        getChangedObjectsHandler();
    } catch (e) {
        console.log(e.message, e.data);
    }
}

// Отправляет данные по сработкам
async function emergencyHandler(amperage, voltage, id) {
    let name = '';
    let current = null;
    let history = [];

    async function getObjectStatus(id) {
        const sql = `SELECT status FROM objects WHERE id = ?`;
        try {
            const result = await executeQuery(sql, [id]);
            return result[0].status;
        } catch (e) {
            throw {message: "Не удалось получить статус объекта", data: {error: e}}
        }
    }
    async function changeObjectStatus(id) {
        const sql = `UPDATE objects SET status = 2, timestamp = ? where id = ?`;
        try {
            await executeQuery(sql, [moment().format('YYYY-MM-DD HH:mm:ss'), id]);
        } catch (e) {
            throw {message: "Не удалось обновить статус объекта", data: {error: e}}
        }
    }

    async function insertIntoEmergency (amperage, id) {
        const sql = `INSERT INTO emergency (current, voltage, timestamp, object_id)
                    VALUES (?, ?, ?, ?)`;
        try {
            await executeQuery(sql, [
                amperage,
                voltage,
                moment().format('YYYY-MM-DD HH:mm:ss'),
                id
            ]);
        } catch (e) {
            throw {message: "Не удалось добавить запись о тревоге", data: {error: e}}
        }
    }

    async function getEmergencyData(id) {
        const sql = `SELECT * FROM emergency WHERE object_id = ? ORDER BY timestamp asc`;
        try {
            const result = await executeQuery(sql, [id]);
            return result;
        } catch (e) {
            throw {message: "Не удалось получить тревоги", data: {erroe: e, id: id}}
        }
    }
    async function getMeasurementsData(id) {
        const sql = `SELECT id, avg_current as current, avg_voltage as voltage, start_timestamp, end_timestamp as timestamp, object_id, isReferential FROM measurements WHERE object_id = ?`;
        try {
            const result = await executeQuery(sql, [id]);
            return result;
        } catch (e) {
            throw {message: "Не удалось получить измерения", data: {erroe: e, id: id}}
        }
    }

    try {
        // Проверяем и меняем статус, если нужно
        const status = await getObjectStatus(id);
        if (!status) {
            await changeObjectStatus(id);
            getChangedObjectsHandler();
        }

        await insertIntoEmergency(amperage, id);

        name = await getObjectNameById(id);



        const measurements  = await getMeasurementsData(id);
        const emergencies   = await getEmergencyData(id);


        // добавляем тревоги в историю
        emergencies.forEach((item, i) => {
            item['status'] = 2;
            item.timestamp = new Date(item.timestamp).getTime();
            history.push(item);
        });

        current = history.pop();

        // Добавляем измерения в историю
        measurements.forEach((item, i) => {
            item['status'] = 1;
            history.push(item);
        });

        let response = {};
            response.type = 'objectDataChanges';
            response.data = {
                history: history,
                name: name,
                id: id,
            };
        // Если есть данные по текущей сработке
        if (current) response.data['current'] = current;
        // console.log("resp", response);

        connectedUsers.forEach((item, i) => {
            item.send(JSON.stringify(response));
        });

    } catch (e) {
        console.log(e.message, e.data);
    }
}

// Сообщение о завершении сработки
async function emergencyStoppedHandler(object_id) {
    try {
        const sql = `UPDATE objects SET status = 0, timestamp = null WHERE id = ?`;
        await executeQuery(sql, [object_id]);
        getChangedObjectsHandler();
    } catch (e) {
        console.log("Не удалось завершить тревогу", e);
    }
}

// Возвращает список с изменениями в объектах
async function getChangedObjectsHandler() {
    try {
        async function getData() {
            const sql = `SELECT * FROM objects`;
            const result = await executeQuery(sql);
            return result;
        }

        const objects = await getData();

        connectedUsers.forEach((item, i) => {
            item.send(JSON.stringify({ type: 'objectsChanges', data: objects }));
        });
    } catch (e) {
        console.log("Не удалось отправить измененные объекты", e);
    }
}

/*
так работает получение id
let id = await getObjectIdByName(name);
console.log(id);
*/
async function getObjectIdByName(name) {
    const sql = `SELECT id FROM objects WHERE name = ?`;
    try {
        const res = await executeQuery(sql, [name]);
        return res[0].id;
    } catch (e) {
        throw {message: "Не удалось найти id по имени", data: {error: e, name: name}};
    }
}

/*
так работает получение имени
let name = await getObjectNameById(id);
console.log(name);
*/
async function getObjectNameById(id) {
    const sql = `SELECT name FROM objects WHERE id = ?`;

    try {
        const res = await executeQuery(sql, [id]);
        return res[0].name;
    } catch (e) {
        throw {message: "Не удалось найти имя по id", data: {error: e, id: id}}
    }
}

// DB SETUP

// Создаем пул соединений
const pool = mysql.createPool({
    connectionLimit: 64, // Максимальное количество соединений в пуле
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
    } catch (e) {
        throw {message: "Ошибка создания базы данных", data: {error: e}};
    }
}

// Функция для создания таблиц
async function createTablesQuery() {
    const createObjectsTableQuery = `
    CREATE TABLE IF NOT EXISTS objects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name TEXT,
        status TINYINT,
        timestamp TIMESTAMP NULL DEFAULT NULL,
        UNIQUE (name(511))
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
    } catch (e) {
        throw {message: "Не удалось создать таблицу Объекты", data: {error: e}};
    }

    try {
        await executeQuery(createMeasurementsTableQuery);
    } catch (e) {
        throw {message: "Не удалось создать таблицу Измерения", data: {error: e}};
    }

    try {
        await executeQuery(createEmergencyTableQuery);
    } catch (e) {
        throw {message: "Не удалось создать таблицу Тревоги", data: {error: e}};
    }
}

// Выполнение всех запросов
async function setupDatabase() {
    try {
        await createDBQuery();
        await createTablesQuery();
        console.log("База данных готова");
    } catch (e) {
        console.log(e.message, e.data);
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
