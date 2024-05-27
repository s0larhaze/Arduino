import ObjectItem from "./components/objectitem.js";
import config     from "./conf.js";

import "../css/style.css";

class App {
    constructor() {
        this.waitingObjects = [];
        this.objectItems    = [];
        this.objects        = [];

        this.start();
    }

    start() {
        this.self = document.createElement("DIV");
        this.self.classList.add("mainWindow");
        document.querySelector('body').appendChild(this.self);

        // Чтобы сразу отрисовать интерфейс
        this.printObjects();
        // А потом запросить данные
        this.startSocet();
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
                    if (item.dataset.search.indexOf(search.value) === -1) {
                        item.classList.add("hidden");
                    } else {
                        item.classList.remove("hidden");
                    }
                });
            });
        this.container.appendChild(search);

        const printEmergency   = () => {
            // Заголовок Тревог
            let heading = document.createElement("H2");
                heading.classList.add("objects_heading");
                heading.textContent = "Тревоги";
            this.container.appendChild(heading);

            // Выводим объекты со статусом тревоги
            this.objects.forEach((obj, i) => {
                if (obj.status !== 2) return;

                let objItem = document.createElement("li");
                    objItem.classList.add("objectsItem");
                    objItem.id = "o" + obj.id;
                    objItem.dataset.search = obj.name;

                let objName = document.createElement("H2");
                    objName.textContent = obj.name;

                let objStatus = document.createElement("P");
                    objStatus.textContent = "Тревога";

                let timer = document.createElement("SPAN");
                    timer.textContent = "-:-:-";
                    // Таймер
                    if (obj.timestamp) {
                        setInterval(() => {
                            const timestamp = new Date(obj.timestamp).getTime();
                            const date = new Date().getTime();

                            timer.textContent = this.getTimeString(timestamp, date);
                        }, 500);
                    }

                objItem.appendChild(objName);
                objItem.appendChild(objStatus);
                objItem.appendChild(timer);

                // При клике создаем окошко с данными об объекте поверх главного экрана
                objItem.addEventListener("click", (event) => {
                    if (this.objectItems[obj.id]) {
                        this.objectItems[obj.id].restart(obj.name, obj.status, obj.timestamp);
                    } else {
                        this.objectItems[obj.id] = new ObjectItem(obj.id, obj.name, obj.status, this, obj.timestamp);
                    }
                });

                // Класс для пометки важных объектов
                objItem.classList.add((obj.status) ? ((obj.status === 2) ? "danger" : "check") : null);

                // Закидываем в список
                this.container.appendChild(objItem);
            });
        }
        const printNormalWork  = () => {
            // Заголовок штатной работы
            let heading = document.createElement("H2");
                heading.classList.add("objects_heading");
                heading.textContent = "Штатная работа"
            this.container.appendChild(heading);

            // Выводим объекты со статусом Проверки
            this.objects.forEach((obj, i) => {
                if (obj.status !== 0) return;
                let objItem = document.createElement("li");
                    objItem.classList.add("objectsItem");
                    objItem.id = "o" + obj.id;
                    objItem.dataset.search = obj.name;

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
                    if (this.objectItems[obj.id]) {
                        this.objectItems[obj.id].restart(obj.name, obj.status, obj.timestamp);
                    } else {
                        this.objectItems[obj.id] = new ObjectItem(obj.id, obj.name, obj.status, this);
                    }
                });

                // Закидываем в список
                this.container.appendChild(objItem);
            });
        }
        const printNoActive    = () => {
            // Заголовок недоступных
            let heading = document.createElement("H2");
                heading.classList.add("objects_heading");
                heading.textContent = "Недоступны";
            this.container.appendChild(heading);

            // Выводим объекты со статусом недоступны
            this.objects.forEach((obj, i) => {
                if (obj.status !== -1) return;
                let objItem = document.createElement("li");
                    objItem.classList.add("objectsItem");
                    objItem.id = "o" + obj.id;
                    objItem.dataset.search = obj.name;
                    objItem.classList.add("unactive");

                let objName = document.createElement("H2");
                    objName.textContent = obj.name;

                let objStatus = document.createElement("P");
                    objStatus.textContent = "Недоступен";

                let timer = document.createElement("SPAN");
                    timer.textContent = "-:-:-";

                objItem.appendChild(objName);
                objItem.appendChild(objStatus);
                objItem.appendChild(timer);

                // При клике создаем окошко с данными об объекте поверх главного экрана
                objItem.addEventListener("click", (event) => {
                    if (this.objectItems[obj.id]) {
                        this.objectItems[obj.id].restart(obj.name, obj.status, obj.timestamp);
                    } else {
                        this.objectItems[obj.id] = new ObjectItem(obj.id, obj.name, obj.status, this);
                    }
                });

                // Закидываем в список
                this.container.appendChild(objItem);
            });
        }
        const printMeasurement = () => {
            // Заголовок Проверок
            let heading = document.createElement("H2");
                heading.classList.add("objects_heading");
                heading.textContent = "Проверки"
            this.container.appendChild(heading);

            // Выводим объекты со статусом Проверки
            this.objects.forEach((obj, i) => {
                if (obj.status !== 1) return;
                let objItem = document.createElement("li");
                    objItem.classList.add("objectsItem");
                    objItem.id = "o" + obj.id;
                    objItem.dataset.search = obj.name;

                let objName = document.createElement("H2");
                    objName.textContent = obj.name;

                let objStatus = document.createElement("P");
                    objStatus.textContent = "Проверка";

                let timer = document.createElement("SPAN");
                    timer.textContent = "-:-:-";
                    if (obj.timestamp) {
                        setInterval(() => {
                            const timestamp = new Date(obj.timestamp).getTime();
                            const date = new Date().getTime();

                            timer.textContent = this.getTimeString(timestamp, date);
                        }, 500);
                    }

                objItem.appendChild(objName);
                objItem.appendChild(objStatus);
                objItem.appendChild(timer);



                // При клике создаем окошко с данными об объекте поверх главного экрана
                objItem.addEventListener("click", (event) => {
                    if (this.objectItems[obj.id]) {
                        this.objectItems[obj.id].restart(obj.name, obj.status, obj.timestamp);
                    } else {
                        this.objectItems[obj.id] = new ObjectItem(obj.id, obj.name, obj.status, this, obj.timestamp);
                    }
                });

                // Класс для пометки важных объектов
                objItem.classList.add((obj.status) ? ((obj.status === 2) ? "danger" : "check") : null);

                // Закидываем в список
                this.container.appendChild(objItem);
            });
        }

        printEmergency();
        printMeasurement();
        printNormalWork();
        printNoActive();
    }

    handleObjectsChanges(newObjects) {
        // Сравниваем новые и старые объекты
        // Переработать. Додумать отключение объктов
        newObjects.forEach(newObj => {
            this.objects.forEach((oldObj, i) => {
                // Выбираем объект
                if (newObj.id !== oldObj.id) return;
                // Если без изменений
                if (newObj.status === oldObj.status) return;

                // Обновляем объект
                this.objects[i] = newObj;

                // Удаляем старый объект, если он есть
                const oldAlarmWindow = document.querySelector(`#alarmWindow${this.id}`);
                if (oldAlarmWindow) oldAlarmWindow.remove();

                // Обновляем открытый объект
                if (this.objectItems[newObj.id]) {
                    if (this.objectItems[newObj.id].isOpen) {
                        this.objectItems[newObj.id].restart(newObj.name, newObj.status, newObj.timestamp);
                    }
                }

                // Если все закончилось - окно создавать не надо
                if (!newObj.status) return ;

                // Создаем окно оповещений
                let div = document.createElement("DIV");
                    div.classList.add("alarmWindow");
                    div.id = `alarmWindow${this.id}`;
                    // Сообщение
                    switch (newObj.status) {
                        case 2:
                            div.innerHTML = `На объекте ${newObj.name} произошла черезвычайная ситуация. <br> Нажмите на это окно, чтобы перейти к просмотру объекта`;
                            break;
                        case 1:
                            div.innerHTML = `На объекте ${newObj.name} началась проверка. <br> Нажмите на это окно, чтобы перейти к просмотру объекта`;
                            break;
                        case -1:
                            div.innerHTML = `Не удалось получить ответ от объекта ${newObj.name}. <br> Скорее всего, объект недоступен`;
                            break;
                        default:

                    }

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
                        if (this.objectItems[newObj.id]) {
                            this.objectItems[newObj.id].restart(newObj.name, newObj.status, newObj.timestamp);
                        } else {
                            this.objectItems[newObj.id] = new ObjectItem(newObj.id, newObj.name, newObj.status, this, newObj.timestamp);
                        }
                        div.remove();
                    });

                this.self.appendChild(div);
            });
        });

        this.printObjects(this.objects);
    }

    async startSocet() {
        // Подключаем сокет
        const url = config.url;
        this.socket = new WebSocket(url);

        // Если подключили - запрашиваем объекты
        this.socket.onopen = () => {
            this.socket.send(JSON.stringify({type: "userRegistration", data: null}));
        };

        // Если закрыли - переподключаемся
        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.log('Соединение закрыто чисто. Переподключимся через минуту.');
            } else {
                console.log();('Обрыв соединения. Повторная попытка подключения через минуту.'); // например, "убит" процесс сервера
            }
            setTimeout(() => {
                this.startSocet();
            }, 60000);
            console.log('Код: ' + event.code + ' причина: ' + event.reason);
        };

        // Если произошла ошибка - просим переподключения
        this.socket.onerror = (error) => {
            if (
                confirm("Подключиться к серверу не удалось. Попробовать снова?")
            ) {
                this.startSocet();
            }
            console.log("Ошибка: " + event.error);
        };

        this.socket.onmessage = (event) => {
            let message = JSON.parse(event.data);
            switch (message.type) {
                // Внутренние запросы
                case "getObjects":
                    this.objects = message.data || [];
                    this.printObjects();
                    break;
                case "objectsChanges":
                    let newObjects = message.data || [];
                    this.handleObjectsChanges(newObjects);
                    break;
                case "objectDataChanges":
                    if (this.objectItems[message.data.id]) {
                        if (this.objectItems[message.data.id].self) {
                            this.objectItems[message.data.id].rePrint(message.data);
                        }
                    }
                    break;
                // Внешние запросы
                case "clearData":
                case "deleteObject":
                case "getObjectData":
                case "startChecking":
                case "changeObjectName":
                    this.waitingObjects.forEach((item, i) => {
                        if (item.id !== message.data.id) return;
                        if (item.type !== message.type) return ;

                        item.state = 1;
                        item.respons = message.data;
                    });
                    break;
                default:
                    console.log("Неизвестный запрос");
            }
        };
    }

    async handleQuery(query) {
        return new Promise((resolve, reject) => {
            if (this.socket.readyState !== 1) {
                console.log("Сокет не готов, попробуйте позже или обновите страницу");
                return;
            }
            let interval;
            switch (query.type) {
                case "deleteObject":
                    this.socket.send(JSON.stringify(query));

                    this.waitingObjects.push({ name: query.data.name, id: query.data.id, respons: null, state: 0, type: query.type });
                    interval = setInterval(() => {
                        this.waitingObjects.forEach((item, i) => {
                            if (item.id !== query.data.id) return;
                            if (item.state) {
                                clearInterval(interval);
                                resolve(item.respons);
                                this.waitingObjects.splice(i, 1);
                                let tmp = document.querySelector(`#${item.name}`);
                                if (tmp) tmp.remove();
                            }
                        });
                    }, 10);
                    break;
                case "clearData":
                case "getObjectData":
                case "startChecking":
                case "changeObjectName":
                    this.socket.send(JSON.stringify(query));

                    this.waitingObjects.push({ name: query.data.name, id: query.data.id, respons: null, state: 0, type: query.type });
                    interval = setInterval(() => {
                        this.waitingObjects.forEach((item, i) => {
                            if (item.id !== query.data.id) return;
                            if (item.state) {
                                clearInterval(interval);
                                resolve(item.respons);
                                this.waitingObjects.splice(i, 1);
                            }
                        });
                    }, 10);
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

}

const app = new App();
