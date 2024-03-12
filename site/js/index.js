/*
Запросы есть в файлах index.js, objectItem.js
методы async startSocet, async startChecking, async changed,
*/


import ObjectItem from "./components/objectItem.js";

const testObjs = [
    {name: "Воронеж база1", status: 0},
    {name: "Воронеж база2", status: 0},
    {name: "Воронеж база3", status: 0},
    {name: "Владимир база1", status: 1},
    {name: "Владимир база2", status: 1},
    {name: "Владимир база3", status: 2},
]

class App {
    constructor() {
        this.objectItems = [];

        this.start();
    }

    start() {
        this.self = document.querySelector('body');
        // Открыть сокет
        this.startSocet();
        // проверка изменений
        setInterval(() => {
            this.changed();
        }, 60000);

        // Вывести объекты (временно)
        // this.printObjects(testObjs);
    }

    async changed() {
        // Это третий из пунктов. Запрос на изменения в состоянии объектов
        let body = {
            type: 'changed',
        };

        // Сюда вставь адрес
        const url = "";
        let response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(body)
        });

        let result = await response.json();
        result.data.forEach((ritem, i) => {
            this.data.forEach((titem, j) => {
                // в тупую перебираем объекты нового и старого запросов и если имена совпадают - проверяем статус
                if (ritem.name === titem.name) {
                    if (ritem.status !== titem.status && ritem.status === 2) {
                        // обновляем данные
                        titem[j] = ritem[i];
                        const div = document.createElement("DIV");
                        div.classList.add("alarmWindow");
                        div.textContent = `На объекте ${titem.name} произошла черезвычайная ситуация.\n Нажмите сюда, чтобе перейти к просмотру объекта`;
                        // При клике мы либо создаем новый либо отрисовываем существующий объект с таблицей.
                        div.addEventListener("click", () => {
                            if (this.objectItems[titem.name]) {
                                this.objectItems[titem.name].restart();
                            } else {
                                this.objectItems[titem.name] = new ObjectItem(titem.name, titem.status, this);
                            }
                            div.remove();
                        });
                        this.printObjects(this.data);
                    }
                }
            });
        });

    }

    async startSocet() {
        // Это первый из пунктов. Запрос объектов.
        let body = {
            type: 'getObjects',
        };
        // Сюда вставь адрес
        const url = "";
        let response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(body)
        });

        let result = await response.json();
        this.data = result.data;
        this.printObjects(this.data);


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

    printObjects(objs) {
        // Сортируем вывод по принципу срочности
        objs.sort(function (a, b) {return b.status - a.status;});

        // Сюда выводятся объекты
        const container = document.createElement("UL");
        container.classList.add("objectsContainer");
        this.self.appendChild(container);

        // Сам вывод
        objs.forEach(obj => {
            const objItem = document.createElement("li");
            objItem.classList.add("objectsItem");
            objItem.innerHTML = `
                <h2>${obj.name}</h2>
                <p>${(obj.status) ? ((obj.status === 2) ? "Тревога" : "Проверка") : "Работает штатно"}</p>
            `;
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
            container.appendChild(objItem);
        });
    }
}

const app = new App();
