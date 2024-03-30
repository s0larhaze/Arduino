import ObjectItem from "./components/objectItem.js";
import { io }     from "socket.io-client";

import "../css/style.css";

const testObjs = [
    { name: "Воронеж база1", status: 0, },
    { name: "Воронеж база2", status: 0, },
    { name: "Воронеж база3", status: 0, },
    { name: "Владимир база1", status: 1, timestamp: 1710584772064 },
    { name: "Владимир база2", status: 1, timestamp: 1710574710615 },
    { name: "Владимир база3", status: 2, timestamp: 1710564710615 },
    { name: "Владимир база4", status: 2, timestamp: 1710559029745 },
];
const respons = {
    current: {
        name: "Воронеж база1",
        status: 2,
        voltage: 12,
        current: 12,
        date: 1710584772064,
    }, // Существует только при тревоге
    history: [
        {
            name: "Воронеж база1",
            status: 1,
            voltage: 12,
            current: 12,
            date: 1700484742064,
            workingHours: 301,
        }, {
            name: "Воронеж база1",
            status: 1,
            voltage: 13,
            current: 10,
            date: 1705584722064,
            workingHours: 293,
        }, {
            name: "Воронеж база1",
            status: 1,
            voltage: 12,
            current: 12,
            date: 1709585772064,
            workingHours: 260,
        }, {
            name: "Воронеж база1",
            status: 2,
            voltage: 12,
            current: 12,
            date: 1710584771064,
        }, {
            name: "Воронеж база1",
            status: 2,
            voltage: 12,
            current: 12,
            date: 1710584771064,
        }, {
            name: "Воронеж база1",
            status: 2,
            voltage: 12,
            current: 12,
            date: 1710584771064,
        }, {
            name: "Воронеж база1",
            status: 2,
            voltage: 12,
            current: 12,
            date: 1710584771064,
        },
    ]
};

class App {
    constructor() {
        this.waitingObjects = [];
        this.objectItems    = [];
        this.responses      = [];
        this.objects        = testObjs;

        this.start();
    }

    async start() {
        this.self = document.createElement("DIV");
        this.self.classList.add("mainWindow");
        document.querySelector('body').appendChild(this.self);

        this.startSocet();

        // this.printObjects(testObjs);
    }

    handleObjectsChanges(newObjects) {
        // Сравниваем новые и старые объекты
        newObjects.forEach(newObj => {
            this.objects.forEach((oldObj, i) => {
                if (newObj.name === oldObj.name) {
                    // Если без изменений
                    if (newObj.status === oldObj.status) return;

                    // Обновляем объект
                    this.objects[i] = newObj;
                    // Создаем окно оповещений
                    let div = document.createElement("DIV");
                    div.classList.add("alarmWindow");
                    // Тревога
                    (newObj.status == 2)
                        ? div.innerHTML = `На объекте ${newObj.name} произошла черезвычайная ситуация. <br> Нажмите на это окно, чтобы перейти к просмотру объекта`
                        : div.innerHTML = `На объекте ${newObj.name} началась проверка. <br> Нажмите на это окно, чтобы перейти к просмотру объекта`;

                    // Кнопка закрытия
                    let closeButton = document.createElement("BUTTON");
                    closeButton.innerHTML = '&#11198;';
                    closeButton.classList.add("alarmWindow_closeButton");
                    closeButton.addEventListener('click', () => {
                        div.remove();
                    });
                    div.appendChild(closeButton);

                    // При клике мы либо создаем новый либо отрисовываем существующий объект с таблицей.
                    div.addEventListener("click", (event) => {
                        if (event.target !== div) return;
                        if (this.objectItems[newObj.name]) {
                            this.objectItems[newObj.name].restart();
                        } else {
                            this.objectItems[newObj.name] = new ObjectItem(newObj.name, newObj.status, this, newObj.timestamp);
                        }
                        div.remove();
                    });
                    this.self.appendChild(div);
                }
            });
        });

        this.printObjects(this.objects);
    }

    async startSocet() {
        // Подключаем сокет
        const url = "ws://127.0.0.1:3000";
        this.socket = new WebSocket(url);

        // Если подключили - запрашиваем объекты
        this.socket.onopen = () => {
            this.socket.send(JSON.stringify({type: "userObjectRegistration", data: null}));
        };

        // Если закрыли - переподключаемся
        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.log('Соединение закрыто чисто. Переподключимся через минуту.');
            } else {
                alert('Обрыв соединения. Повторная попытка подключения через минуту.'); // например, "убит" процесс сервера
            }
            setTimeout(() => {
                this.startSocet();
            }, 60000);
            console.log('Код: ' + event.code + ' причина: ' + event.reason);
        };

        // Если произошла ошибка - просим переподключения
        this.socket.onerror = (error) => {
            console.log("Подключиться к серверу не удалось. Для повторной попытки подключения обновите страницу.");
            console.log("Ошибка: " + event.error);
        };

        this.socket.onmessage = (event) => {
            let data = JSON.parse(event.data);
            switch (data.type) {
                case "getObjects":
                    this.objects = data.data || [];
                    this.printObjects(this.objects);
                    break;
                case "objectsChanges":
                    let newObjects = event.data.objects || [];
                    this.handleObjectsChanges(newObjects);
                    break;
                case "getObjectData":
                    this.waitingObjects.forEach((item, i) => {
                        if (item.name !== data.data.current.name) return;
                        item.state = 1;
                        item.respons = data.data;
                    });
                    break;
                case "objectDataChanges":
                    if (this.objectItems[data.name]) {
                        if (this.objectItems[data.current.name].self) {
                            this.objectItems[obj.name].restart();
                        }
                    }
                    break;
                default:
                    console.log("Неизвестный запрос");
            }
        };
    }

    async handleQuery(query) {
        return new Promise((resolve, reject) => {
            if (this.socket.readyState !== 1) {
                reject(new Error('Socket is not ready.'));
                return;
            }

            switch (query.type) {
                case "getObjectData":
                    this.socket.send(JSON.stringify(query));
                    this.waitingObjects.push({ name: query.name, respons: null, state: 0 });
                    this.responses[query.name] = null;
                    const interval = setInterval(() => {
                        this.waitingObjects.forEach((item, i) => {
                            if (item.name !== query.name) return;
                            if (item.state) {
                                clearInterval(interval);
                                console.log(item.respons);
                                resolve(item.respons);
                            }
                        });
                    }, 10);
                    break;
                case "clearData":
                case "deleteObject":
                case "startChecking":
                case "changeObjectName":
                    this.socket.send(JSON.stringify(query));
                    resolve(); // Resolve без данных, так как эти запросы не возвращают результат.
                    break;
                default:
                    reject(new Error('Unknown query type.'));
            }
        });
    }


    getTimeString(start, end) {
        const time = (end - start) / 1000;
        let hours = (Math.floor(time / 3600) > 9) ? Math.floor(time / 3600) : `0${Math.floor(time / 3600)}`;
        let minutes = (Math.floor((time % 3600) / 60) > 9) ? Math.floor((time % 3600) / 60) : `0${Math.floor((time % 3600) / 60)}`;
        let seconds = (Math.floor(time % 60) > 9) ? Math.floor(time % 60) : `0${Math.floor(time % 60)}`;

        return `${hours}:${minutes}:${seconds}`;
    }

    printObjects() {
        // Сюда выводятся объекты
        if (this.container) this.container.remove();

        this.container = document.createElement("UL");
        this.container.classList.add("objectsContainer");
        this.self.appendChild(this.container);

        // Поиск по объектам
        let search = document.createElement("INPUT");
        search.classList.add("objects_search");
        search.type = "text";
        search.name = "search";
        search.placeholder = "Название объекта";
        search.addEventListener("input", () => {
            this.container.querySelectorAll("li").forEach((item, i) => {
                if (item.id.indexOf(search.value) === -1) {
                    item.classList.add("hidden");
                } else {
                    item.classList.remove("hidden");
                }
            });

        });
        this.container.appendChild(search);

        // Заголовок Тревог
        let heading = document.createElement("H2");
        heading.classList.add("objects_heading");
        heading.textContent = "Тревоги"
        this.container.appendChild(heading);

        // Выводим объекты со статусом тревоги
        this.objects.forEach((obj, i) => {
            if (obj.status !== 2) return;
            let objItem = document.createElement("li");
            objItem.classList.add("objectsItem");
            objItem.id = obj.name;

            let objName = document.createElement("H2");
            objName.textContent = obj.name;

            let objStatus = document.createElement("P");
            objStatus.textContent = "Тревога";

            let timer = document.createElement("SPAN");
            timer.textContent = "-:-:-";

            objItem.appendChild(objName);
            objItem.appendChild(objStatus);
            objItem.appendChild(timer);

            if (obj.timestamp) {
                setInterval(() => {
                    const date = new Date().getTime();

                    timer.textContent = this.getTimeString(obj.timestamp, date);
                }, 1000);
            }


            // При клике создаем окошко с данными об объекте поверх главного экрана
            objItem.addEventListener("click", (event) => {
                if (this.objectItems[obj.name]) {
                    this.objectItems[obj.name].restart();
                } else {
                    this.objectItems[obj.name] = new ObjectItem(obj.name, obj.status, this, obj.timestamp);
                }
            });

            // Класс для пометки важных объектов
            objItem.classList.add((obj.status) ? ((obj.status === 2) ? "danger" : "check") : null);

            // Закидываем в список
            this.container.appendChild(objItem);
        });

        // Заголовок Проверок
        heading = document.createElement("H2");
        heading.classList.add("objects_heading");
        heading.textContent = "Проверки"
        this.container.appendChild(heading);

        // Выводим объекты со статусом Проверки
        this.objects.forEach((obj, i) => {
            if (obj.status !== 1) return;
            let objItem = document.createElement("li");
            objItem.classList.add("objectsItem");
            objItem.id = obj.name;


            let objName = document.createElement("H2");
            objName.textContent = obj.name;

            let objStatus = document.createElement("P");
            objStatus.textContent = "Проверка";

            let timer = document.createElement("SPAN");
            timer.textContent = "-:-:-";

            objItem.appendChild(objName);
            objItem.appendChild(objStatus);
            objItem.appendChild(timer);

            if (obj.timestamp) {
                setInterval(() => {
                    const date = new Date().getTime();

                    timer.textContent = this.getTimeString(obj.timestamp, date);
                }, 1000);
            }


            // При клике создаем окошко с данными об объекте поверх главного экрана
            objItem.addEventListener("click", (event) => {
                if (this.objectItems[obj.name]) {
                    this.objectItems[obj.name].restart();
                } else {
                    this.objectItems[obj.name] = new ObjectItem(obj.name, obj.status, this, obj.timestamp);
                }
            });

            // Класс для пометки важных объектов
            objItem.classList.add((obj.status) ? ((obj.status === 2) ? "danger" : "check") : null);

            // Закидываем в список
            this.container.appendChild(objItem);
        });

        // Заголовок штатной работы
        heading = document.createElement("H2");
        heading.classList.add("objects_heading");
        heading.textContent = "Штатная работа"
        this.container.appendChild(heading);

        // Выводим объекты со статусом Проверки
        this.objects.forEach((obj, i) => {
            if (obj.status !== 0) return;
            let objItem = document.createElement("li");
            objItem.classList.add("objectsItem");
            objItem.id = obj.name;


            let objName = document.createElement("H2");
            objName.textContent = obj.name;

            let objStatus = document.createElement("P");
            objStatus.textContent = "Работает штатно";

            let timer = document.createElement("SPAN");
            timer.textContent = "-:-:-";

            objItem.appendChild(objName);
            objItem.appendChild(objStatus);
            objItem.appendChild(timer);

            // При клике создаем окошко с данными об объекте поверх главного экрана
            objItem.addEventListener("click", (event) => {
                if (this.objectItems[obj.name]) {
                    this.objectItems[obj.name].restart();
                } else {
                    this.objectItems[obj.name] = new ObjectItem(obj.name, obj.status, this);
                }
            });

            // Закидываем в список
            this.container.appendChild(objItem);
        });
    }
}

const app = new App();
