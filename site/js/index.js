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
        this.currentObjectItem = null;
        
        this.start();
    }

    start() {
        this.self = document.querySelector('body');
        // Открыть сокет

        // Запросить объекты

        // Вывести объекты
        this.printObjects(testObjs);
    }

    cleareObjectItem() {
        this.currentObjectItem = null;
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
                this.currentObjectItem = new ObjectItem(obj.name, obj.status, this);
            });
            // Класс для пометки важных объектов
            objItem.classList.add((obj.status) ? ((obj.status === 2) ? "danger" : "check") : null);

            // Закидываем в список
            container.appendChild(objItem);
        });
    }
}

const app = new App();
