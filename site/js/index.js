import ObjectItem from "./components/objectItem.js";
import { io } from "socket.io-client";
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


class App {
    constructor() {
        this.objectItems = [];
        this.objects = testObjs;
        this.start();
    }

    async start() {
        this.self = document.querySelector('body');
        let testCount = 0;
        setInterval(() => {
            console.log(`Test ${testCount++} start`);
            let testObj = [];
            this.objects.forEach((item, i) => {
                testObj[i] = {...this.objects[i], status: Math.floor(Math.random() * 3)};
            });

            this.handleObjectsChanges(testObj);

        }, 10000);



        // Открыть сокет
        // this.startSocet();
        // проверка изменений
        // setInterval(() => {
            // this.changed();
        // }, 60000);
        // const socket = io('http://147.45.101.134:3000', {transports: ['websocket']} );
        // socket.on('getListOfObjectsRequest', (message) => {
        //     console.log(message);
        // });
        // socket.on('getListOfObjectsResponse', (message) => {
        //     console.log(message);
        // });
        // setInterval(() => {
        //     console.log("getListOfObjectsRequest sended");
        //     socket.emit('getListOfObjectsRequest');
        // }, 1000);
        // Вывести объекты (временно)



        this.printObjects(testObjs);
        this.printAddObject();
    }

    handleObjectsChanges(newObjects) {

        // Сравниваем новые и старые объекты
        newObjects.forEach(newObj => {
            this.objects.forEach((oldObj, i) => {
                if (newObj.name === oldObj.name) {
                    // Если без изменений
                    if (newObj.status === oldObj.status) return ;

                    console.log("test");
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
                        if (event.target !== div) return ;
                        if (this.objectItems[newObj.name]) {
                            this.objectItems[newObj.name].restart();
                        } else {
                            this.objectItems[newObj.name] = new ObjectItem(newObj.name, newObj.status, this);
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
        let body = {
            type: 'getObjects',
        };

        const url = "http://127.0.0.1:3000/api/getObjects";
        let response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            let data = await response.json();
            console.log(data);
            this.data = data;
            this.printObjects(this.data);
        } else {
            console.error('Failed to fetch data:', response.status);
        }


        // Под сокет, пока не пашет
        // const ip = "arduino/site";
        // const port = "8080";
        // const path = `wss://${ip}:${port}`
        // this.socket = new WebSocket(path);
        //
        // this.socket.onopen = function(e) {
        //     // Запрашиваем объекты (в формате имя + статус)
        //     socket.send(JSON.stringify({type: "getObjects"}));
        // };
        //
        // this.socket.onmessage = function(event) {
        //     switch (event.data.type) {
        //         case "getObjects":
        //             this.objects = testObjs;
        //             // this.objects = event.data.objects;
        //             this.printObjects(this.objects);
        //             break;
        //         case "alarm":
        //             // Обрабатываем пришедшую тревогу
        //             break;
        //         case "testStart":
        //             // Сообщаем о начале проверки или об ошибке
        //             break;
        //         case "testEnd":
        //             // Сообщаем о завершении проверки или об ошибке
        //             break;
        //         default:
        //         break;
        //     }
        // };
        //
        // this.socket.onclose = function(event) {
        //     if (event.wasClean) {
        //         alert(`[close] Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
        //     } else {
        //         alert('[close] Соединение прервано');
        //     }
        // };
        //
        // this.socket.onerror = function(error) {
        //     alert(`[error]`);
        // };
    }

    getTimeString(start, end) {
        const time = (end - start) / 1000;
        let hours   = (Math.floor(time / 3600) > 9) ? Math.floor(time / 3600) : `0${Math.floor(time / 3600)}`;
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
                    this.objectItems[obj.name] = new ObjectItem(obj.name, obj.status, this);
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
                    this.objectItems[obj.name] = new ObjectItem(obj.name, obj.status, this);
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

    printAddObject() {
        this.addObject = document.createElement("DIV");
        this.addObject.textContent = "Тут будет панель добавления объекта";
        this.addObject.classList.add("addObject");
        this.self.appendChild(this.addObject);
    }
}

const app = new App();
