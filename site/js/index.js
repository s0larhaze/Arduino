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

        this.start();
    }

    start() {
        // Открыть сокет

        // Запросить объекты

        // Вывести объекты
        this.printObjects(testObjs);
    }

    printObjects(objs) {
        objs.sort(function (a, b) {return b.status - a.status;});

        const container = document.createElement("UL");
        container.classList.add("objectsContainer");
        document.querySelector('body').appendChild(container);
        objs.forEach(obj => {
            const objItem = document.createElement("li");
            objItem.classList.add("objectsItem");
            objItem.innerHTML = `<h2>${obj.name}</h2><p>${(obj.status) ? ((obj.status === 2) ? "Тревога" : "Проверка") : "Активно"}</p>`;
            switch (obj.status) {
                case 1:
                    objItem.classList.add("check");
                    break;
                case 2:
                    objItem.classList.add("danger");
                    break;
                default:
                break;
            }

            container.appendChild(objItem);
        });
    }
}

const app = new App();
