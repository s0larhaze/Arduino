export default class ObjectItem {
    constructor(name, status, parent) {
        this.id = name;
        this.status = status;
        this.parent = parent;
        this.timer = 0;

        this.start();
    }

    start() {
        // Само окно
        this.self = document.createElement("ASIDE");
        this.self.classList.add("alertWindow");
        this.parent.self.appendChild(this.self);

        this.header = document.createElement("HEADER");
        const main = document.createElement("MAIN");
        const back = document.createElement("BUTTON");
        this.startCheck = document.createElement("BUTTON");
        this.timerCon = document.createElement("SPAN");

        // Кнопка назад
        back.textContent = "<";
        back.type = "button";
        back.name = "back";
        back.classList.add("back");
        back.addEventListener('click', (event) => {
            this.finish();
        });

        // Кнопка начала проверки
        this.startCheck.textContent = "Запустить проверку";
        this.startCheck.type = "button";
        this.startCheck.name = "startCheck";
        this.startCheck.classList.add("start_check");
        this.startCheck.addEventListener('click', (event) => {
            this.startChecking();
        });

        // Таймер
        this.timerCon.textContent = "00:00:00";
        this.timerCon.classList.add("timer");

        

        // Заполняем шапку
        this.header.appendChild(back);
        this.header.appendChild(this.startCheck);
        this.header.appendChild(this.timerCon);

        this.self.appendChild(this.header);
        this.self.appendChild(main);
    }

    finish() {
        this.self.remove();
        // Возможно, лучше сохранять их в список в апп и при повторном выборе просто возвращать
        this.parent.cleareObjectItem();
    }

    startChecking() {
        // Просим сервер запустить проверку.
        // Запускаем таймер
        if (true) {
            this.startTimer();
        }

        // Блокируем кнопку начала проверки
        this.startCheck.disabled = true;

        // Делаем что-то, когда проверка завершиться
    }

    startTimer() {
        // Простенький таймер
        this.timer = new Date().getTime();
        this.timerInterval = setInterval(() => {
            let timeInSeconds = (new Date().getTime() - this.timer) / 1000;

            let hou = Math.floor(timeInSeconds / 3600);
            let min = Math.floor(timeInSeconds % 3600 / 60 );
            let sec = Math.floor(timeInSeconds % 60);

            hou = (hou > 9) ? hou : "0" + hou;
            min = (min > 9) ? min : "0" + min;
            sec = (sec > 9) ? sec : "0" + sec;

            this.timerCon.textContent = `${hou}:${min}:${sec}`
        }, 100);
    }
}
