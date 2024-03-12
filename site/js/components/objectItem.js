export default class ObjectItem {
    constructor(name, status, parent) {
        this.id = name;
        this.status = status;
        this.parent = parent;
        this.timer = 0;
        this.data = [
            {
                name: "Воронеж база1",
                status: 0,
                i: 12,
                u: 12,
                Cconst: 14,
                e: 14,
                ob1: 15,
                date: "2022-10-12, 23:50:21",
                workingHours: "5:45",
            },
            {
                name: "Воронеж база1",
                status: 0,
                i: 12,
                u: 12,
                Cconst: 14,
                e: 14,
                ob1: 14,
                date: "2023-06-14, 23:50:21",
                workingHours: "5:40",
            },
            {
                name: "Воронеж база1",
                status: 0,
                i: 12,
                u: 12,
                Cconst: 14,
                e: 14,
                ob1: 14,
                date: "2023-12-06, 23:50:21",
            },
            {
                name: "Воронеж база1",
                status: 0,
                i: 12,
                u: 12,
                Cconst: 14,
                e: 14,
                ob1: 14,
                date: "2024-05-08, 23:50:21",
            },
            {
                name: "Воронеж база1",
                status: 2,
                i: 12,
                u: 12,
                Cconst: 14,
                e: 14,
                ob1: 14,
                date: "2024-11-22, 23:50:21",
            },
        ]

        this.start();
    }

    start() {
        // Само окно
        this.self = document.createElement("ASIDE");
        this.self.classList.add("alertWindow");
        this.parent.self.appendChild(this.self);

        this.header = document.createElement("HEADER");
        this.main = document.createElement("MAIN");
        this.back = document.createElement("BUTTON");
        this.startCheck = document.createElement("BUTTON");
        this.timerCon = document.createElement("SPAN");
        this.selectTimeline = document.createElement("SECTION");
        this.tableContainer = document.createElement("SECTION");
        this.selectYear = document.createElement("SELECT");
        this.selectMonth = document.createElement("SELECT");
        this.selectDay = document.createElement("SELECT");
        this.table = document.createElement("TABLE");

        // Кнопка назад
        this.back.textContent = "<";
        this.back.type = "button";
        this.back.name = "back";
        this.back.classList.add("back");
        this.back.addEventListener('click', (event) => {
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

        // Контейнеры
        this.selectTimeline.classList.add("selectTimeline");
        this.tableContainer.classList.add("table_container");

        // Выбор года
        this.selectYear.name = "selectYear";
        this.selectYear.classList.add("select_year");
        this.fillSelectYear();
        this.selectYear.addEventListener("change", (event) => {
            this.selectYearHandler(event.target.value);
        })

        // Выбор месяца
        this.selectMonth.name = "selectMonth";
        this.selectMonth.classList.add("select_month");
        this.fillSelectMonth();
        this.selectMonth.addEventListener("change", (event) => {
            this.selectMonthHandler(event.target.value);
        })

        // Выбор дня
        this.selectDay.name = "selectDay";
        this.selectDay.classList.add("select_day");
        this.fillSelectDay();

        // Таблица
        this.fillTableHead();
        this.fillTableBody();

        // Заполняем шапку
        this.header.appendChild(this.back);
        this.header.appendChild(this.startCheck);
        this.header.appendChild(this.timerCon);

        // Заполняем тело
        this.main.appendChild(this.selectTimeline);
        this.main.appendChild(this.tableContainer);

        // Заполняем выбор времени
        this.selectTimeline.appendChild(this.selectYear);
        this.selectTimeline.appendChild(this.selectMonth);
        this.selectTimeline.appendChild(this.selectDay);

        // Добавляем таблицу
        this.tableContainer.appendChild(this.table);

        this.self.appendChild(this.header);
        this.self.appendChild(this.main);
    }

    finish() {
        this.self.remove();
    }

    restart() {
        this.parent.self.appendChild(this.self);
    }

    async startChecking() {
        // Просим сервер запустить проверку.


        // Это второй из пунктов. Запрос на проверку.
        let body = {
            type: 'startCheck',
            name: this.id,
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

    fillSelectYear() {
        // Получаем данные
        // Начальное значение
        let op = document.createElement("OPTION");
        op.textContent = "Выберите год";
        op.value = null;
        this.selectYear.appendChild(op);
        let set = new Set();

        this.data.forEach(item => {
            const pattern = /(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/;
            const date = item.date.match(pattern)[1];

            set.add(date);
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => {return a - b});

        set.forEach((item, i) => {
            op = document.createElement("OPTION");
            op.textContent = item;
            op.value = item;
            this.selectYear.appendChild(op);
        });
    }

    fillSelectMonth() {
        // Получаем данные
        let op = document.createElement("OPTION");
        op.textContent = "Выберите месяц";
        op.value = null;
        this.selectMonth.appendChild(op);
        let set = new Set();

        this.data.forEach(item => {
            const pattern = /(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/;
            const date = item.date.match(pattern)[2];

            set.add(date);
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => {return a - b});

        set.forEach((item, i) => {
            op = document.createElement("OPTION");
            op.textContent = item;
            op.value = item;
            this.selectMonth.appendChild(op);
        });
    }

    fillSelectDay() {
        // Получаем данные
        let op = document.createElement("OPTION");
        op.textContent = "Выберите день";
        op.value = null;
        this.selectDay.appendChild(op);
        let set = new Set();

        this.data.forEach(item => {
            const pattern = /(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/;
            const date = item.date.match(pattern)[3];

            set.add(date);
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => {return a - b});

        set.forEach((item, i) => {
            op = document.createElement("OPTION");
            op.textContent = item;
            op.value = item;
            this.selectDay.appendChild(op);
        });
    }

    selectYearHandler(year) {
        // Очищаем
        this.selectMonth.innerHTML = "";
        // Начальное значение
        let op = document.createElement("OPTION");
        op.textContent = "Выберите месяц";
        op.value = null;
        this.selectMonth.appendChild(op);
        let set = new Set();
        // Наполняем только месяцами указанного года
        this.data.forEach(item => {
            const pattern = /(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/;
            let date = item.date.match(pattern);
            if (date[1] === year) {
                set.add(date[2]);

            }
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => {return a - b});

        set.forEach((item, i) => {
            op = document.createElement("OPTION");
            op.textContent = item;
            op.value = item;
            this.selectMonth.appendChild(op);
        });

        // День
        // Очищаем
        this.selectDay.innerHTML = "";
        // Начальное значение
        op = document.createElement("OPTION");
        op.textContent = "Выберите день";
        op.value = null;
        this.selectDay.appendChild(op);
        set = new Set();
        // Наполняем только месяцами указанного года
        this.data.forEach(item => {
            const pattern = /(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/;
            let date = item.date.match(pattern);
            if (date[1] === year) {
                set.add(date[3]);

            }
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => {return a - b});

        set.forEach((item, i) => {
            op = document.createElement("OPTION");
            op.textContent = item;
            op.value = item;
            this.selectDay.appendChild(op);
        });
    }

    selectMonthHandler(month) {
        // Очищаем
        this.selectDay.innerHTML = "";
        // Начальное значение
        let op = document.createElement("OPTION");
        op.textContent = "Выберите день";
        op.value = null;
        this.selectDay.appendChild(op);
        let set = new Set();
        // Наполняем только месяцами указанного года
        this.data.forEach(item => {
            const pattern = /(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/;
            let date = item.date.match(pattern);
            if (date[2] === month) {
                set.add(date[3]);

            }
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => {return a - b});

        set.forEach((item, i) => {
            op = document.createElement("OPTION");
            op.textContent = item;
            op.value = item;
            this.selectDay.appendChild(op);
        });
    }

    fillTableHead() {
        const thead = document.createElement("THEAD");
        const tr = document.createElement("TR");
        const th = document.createElement("TH");
        const sortU = document.createElement("TD");
        const sortI = document.createElement("TD");
        const sortC = document.createElement("TD");
        const sortP = document.createElement("TD");
        const p_const = document.createElement("TD");
        const sortTime = document.createElement("TD");

        th.textContent = this.id;
        sortU.textContent = "Напряжение U(В)";
        sortI.textContent = "Сила тока I(A)";
        sortC.textContent = "Емкость C(А/ч)";
        sortP.textContent = "Мощность P(Вт)";
        p_const.textContent = "Деградация %";
        sortTime.textContent = "Расчетное время работы";

        this.table.appendChild(thead);
        thead.appendChild(tr);
        tr.appendChild(th);
        tr.appendChild(sortU);
        tr.appendChild(sortI);
        tr.appendChild(sortC);
        tr.appendChild(sortP);
        tr.appendChild(p_const);
        tr.appendChild(sortTime);
    }

    async fillTableBody() {
        let body = {
            type: 'getData',
            name: this.id,
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

        const tbody = document.createElement("TBODY");
        this.data.forEach((item, i) => {
            const tr = document.createElement("TR");
            const th = document.createElement("TH");
            const sortU = document.createElement("TD");
            const sortI = document.createElement("TD");
            const sortC = document.createElement("TD");
            const sortP = document.createElement("TD");
            const p_const = document.createElement("TD");
            const sortTime = document.createElement("TD");

            const pattern = /(\d{4})-(\d{2})-(\d{2}), (\d{2}:\d{2}:\d{2})/;
            let date = item.datetime.match(pattern)[3];

            th      .textContent = `${date}`
            sortU   .textContent = `${item.voltage}`;
            sortI   .textContent = `${item.current}`;
            sortC   .textContent = `${item.capacity}`;
            sortP   .textContent = `${item.voltage * item.current}`;
            p_const .textContent = `-`;
            sortTime.textContent = `${item.capacity * item.current}`;

            this.table.appendChild(tbody);
            tbody.appendChild(tr);
            tr.appendChild(th);
            tr.appendChild(sortU);
            tr.appendChild(sortI);
            tr.appendChild(sortC);
            tr.appendChild(sortP);
            tr.appendChild(p_const);
            tr.appendChild(sortTime);
        });

    }
}
