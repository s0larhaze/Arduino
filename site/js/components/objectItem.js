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
                voltage: 12,
                current: 12,
                time: 14,
                date: "2022-10-12T23:50:21",
                workingHours: "5:45",
            },
            {
                name: "Воронеж база1",
                status: 0,
                voltage: 12,
                current: 12,
                time: 14,
                date: "2023-11-13T23:50:21",
                workingHours: "5:40",
            },
            {
                name: "Воронеж база1",
                status: 0,
                voltage: 12,
                current: 12,
                time: 14,
                date: "2023-12-14T23:50:21",
            },
            {
                name: "Воронеж база1",
                status: 0,
                voltage: 12,
                current: 12,
                time: 14,
                date: "2024-05-08T23:50:21",
            },
            {
                name: "Воронеж база1",
                status: 2,
                voltage: 12,
                current: 12,
                time: 14,
                date: "2024-11-22T23:50:21",
            },
        ];
        this.filter = {year: "null", month: "null", day: "null"};

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
        this.selectYear.name = "year";
        this.selectYear.classList.add("select_year");
        this.fillSelectYear();
        this.selectYear.addEventListener("change", (event) => {
            this.setFilter(event.target.name, event.target.value);
        })

        // Выбор месяца
        this.selectMonth.name = "month";
        this.selectMonth.classList.add("select_month");
        this.fillSelectMonth();
        this.selectMonth.addEventListener("change", (event) => {
            this.setFilter(event.target.name, event.target.value);
        })

        // Выбор дня
        this.selectDay.name = "day";
        this.selectDay.classList.add("select_day");
        this.fillSelectDay();
        this.selectDay.addEventListener("change", (event) => {
            this.setFilter(event.target.name, event.target.value);
        })

        // Таблица
        this.fillTableHead();
        this.fillTableBody(this.data);

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
            let min = Math.floor(timeInSeconds % 3600 / 60);
            let sec = Math.floor(timeInSeconds % 60);

            hou = (hou > 9) ? hou : "0" + hou;
            min = (min > 9) ? min : "0" + min;
            sec = (sec > 9) ? sec : "0" + sec;

            this.timerCon.textContent = `${hou}:${min}:${sec}`
        }, 100);
    }

    setFilter(name, value) {
        if (name == 'year') {
            this.filter.year = value;
            this.filter.month = "null";
            this.filter.day = "null";
        } else if (name == 'month') {
            this.filter.month = value;
            this.filter.day = "null";
        } else {
            this.filter.day = value;
        }

        this.updateTable();
    }

    updateTable() {
        console.log(this.filter);
        let filteredData = [];
        let temp = [];
        let months = new Set();
        let days   = new Set();

        // Если выбран год
        if (this.filter.year != "null") {
            // Получаем месяцы и дни этого года
            this.data.forEach(item => {
                const date = new Date(item.date);

                if (date.getFullYear() == this.filter.year) {
                    filteredData.push(item); // Добавляем элемент

                    months.add(date.getMonth()); // Добавляем месяц элемента
                    days.add(date.getDay()); // Добавляем день элемента
                }
            });
        }
        // Обновляем фильтр месяцев
            // Если год не выбран - отображаем все месяцы
            if (!months.size) {
                this.data.forEach(item => {
                    let date = new Date(item.date);
                    months.add(date.getMonth());
                });
            }

            months = Array.from(months).sort((a, b) => { return a - b });

            // Чистим все кроме пустого элемента
            this.selectMonth.querySelectorAll("option").forEach((item, i) => {
                if (item.value == "null") return ;
                item.remove();
            });
            // Наполняем фильтр значениями
            months.forEach((item, i) => {
                const op = document.createElement("OPTION");
                op.textContent = item;
                op.value = item;

                if (item == this.filter.month) op.selected = true;

                this.selectMonth.appendChild(op);
            });

        // Месяц
        if (this.filter.month != "null") {
            // Если выбран месяц, то дней может быть меньше, потому мы их перебираем
            days = new Set();

            if (!filteredData.length) filteredData = this.data;

            filteredData.forEach(item => {
                const date = new Date(item.date);

                if (date.getMonth() == this.filter.month) {
                    temp.push(item); // Добавляем элемент

                    days.add(date.getDay()); // Добавляем день
                }
            });
            filteredData = temp;
            temp = [];
        }

        // Обновляем фильтр дней

            // Если месяц не выбран - отображаем все дни
            if (!days.size) {
                this.data.forEach(item => {
                    let date = new Date(item.date);
                    days.add(date.getDay());
                });
            }

            days = Array.from(days).sort((a, b) => { return a - b });

            // Чистим все кроме пустого элемента
            this.selectDay.querySelectorAll("option").forEach((item, i) => {
                if (item.value == "null") return ;
                item.remove();
            });
            // Наполняем фильтр значениями
            days.forEach((item, i) => {
                const op = document.createElement("OPTION");
                op.textContent = item;
                op.value = item;

                if (item == this.filter.day) op.selected = true;

                this.selectDay.appendChild(op);
            });
        // День
        if (this.filter.day != "null") {
            console.log("day");
            filteredData.forEach(item => {
                const date = new Date(item.date);

                if (date.getDay() == this.filter.day) {
                    temp.push(item);
                }
            });
            filteredData = temp;
            temp = [];
        }

        // Если список пуст - значит никаких фильтров не выбрано и надо вывести все.
        if (!filteredData.length) filteredData = this.data;

        this.fillTableBody(filteredData);
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
            let date = new Date(item.date);
            date = date.getFullYear();

            set.add(date);
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => { return a - b });

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
            let date = new Date(item.date);
            date = date.getMonth();

            set.add(date);
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => { return a - b });

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
            let date = new Date(item.date);
            date = date.getDay();

            set.add(date);
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => { return a - b });

        set.forEach((item, i) => {
            op = document.createElement("OPTION");
            op.textContent = item;
            op.value = item;
            this.selectDay.appendChild(op);
        });
    }

    selectYearHandler(year) {
        // Подготавливаем данные для таблицы
        let data = [];

        // Очищаем
        this.selectMonth.innerHTML = "";
        this.selectDay.innerHTML = "";

        // Начальное значение
        let monthOp = document.createElement("OPTION");
            monthOp.textContent = "Выберите месяц";
            monthOp.value = null;

        let dayOp = document.createElement("OPTION");
            dayOp.textContent = "Выберите день";
            dayOp.value = null;

        this.selectMonth.appendChild(monthOp);
        this.selectDay.appendChild(dayOp);

        // Набор для сортировки
        let monthSet = new Set();
        let daySet   = new Set();

        // Формируем наборы
        this.data.forEach(item => {
            let date = new Date(item.date);
            if (date.getFullYear() == year) {
                monthSet.add(date.getMonth());
                daySet.add(date.getDay());

                data.push(item);
            }
        });

        // Сортировка
        monthSet = Array.from(monthSet).sort((a, b) => { return a - b });
        daySet = Array.from(daySet).sort((a, b) => { return a - b });

        // Вывод
        monthSet.forEach((item, i) => {
            monthOp = document.createElement("OPTION");
            monthOp.textContent = item;
            monthOp.value = item;
            this.selectMonth.appendChild(monthOp);
        });

        daySet.forEach((item, i) => {
            dayOp = document.createElement("OPTION");
            dayOp.textContent = item;
            dayOp.value = item;
            this.selectDay.appendChild(dayOp);
        });

        this.fillTableBody(data);
    }

    selectMonthHandler(month) {
        // Подготавливаем данные для таблицы
        let data = [];

        // Очищаем
        this.selectDay.innerHTML = "";

        // Начальное значение
        let op = document.createElement("OPTION");
            op.textContent = "Выберите день";
            op.value = null;

        this.selectDay.appendChild(op);

        // Набор для сортировки
        let set = new Set();

        // Формируем наборы
        this.data.forEach(item => {
            let date = new Date(item.date);

            if (date.getMonth() == month) {
                // Если выбран год
                if (this.selectYear.value) {
                    if (date.getFullYear() == this.selectYear.value) {
                        data.push(item);
                        set.add(date.getDay());
                    }
                } else {
                    data.push(item);
                    set.add(date.getDay());
                }
            }
        });
        // Сортировка
        set = Array.from(set).sort((a, b) => { return a - b });

        // Вывод
        set.forEach((item, i) => {
            op = document.createElement("OPTION");
            op.textContent = item;
            op.value = item;
            this.selectDay.appendChild(op);
        });

        this.fillTableBody(data);
    }

    selectDayHandler(day) {
        // Необходимость метода и сортировке по дню под вопросом
        // Подготавливаем данные для таблицы
        let data = [];
        // Формируем данные
        this.data.forEach(item => {
            let date = new Date(item.date);
            if (date.getDay() == day) {
                // Если выбран год
                if (this.selectYear.value) {
                    // И выбран месяц
                    if (this.selectMonth.value) {
                        if (date.getFullYear() == this.selectYear.value
                        &&  date.getMonth()    == this.selectMonth.value) data.push(item);
                    } else {
                        // И не выбран месяц
                        if (date.getFullYear() == this.selectYear.value) data.push(item);
                    }
                } else if (this.selectMonth.value) {
                    // Если выбран месяц
                    if (this.selectMonth.value) {
                        if (date.getMonth() == this.selectMonth.value) data.push(item);
                    }
                } else {
                    data.push(item);
                }
            }
        });

        this.fillTableBody(data);
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

    async fillTableBody(data) {
        // let body = {
        //     type: 'getData',
        //     name: this.id,
        // };
        //
        // // Сюда вставь адрес
        // const url = "http://127.0.0.1:3000/api/getData";
        // let response = await fetch(url, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json;charset=utf-8'
        //     },
        //     body: JSON.stringify(body)
        // });
        //
        // if (response.ok) {
        //     let result = await response.json();
        //     this.data = result;
        // }

        // Если таблица уже существует
        if(this.table.querySelector('tbody')) this.table.querySelector('tbody').remove();

        const tbody = document.createElement("TBODY");
        data.forEach((item, i) => {
            const tr = document.createElement("TR");
            const th = document.createElement("TH");
            const sortU = document.createElement("TD");
            const sortI = document.createElement("TD");
            const sortC = document.createElement("TD");
            const sortP = document.createElement("TD");
            const p_const = document.createElement("TD");
            const sortTime = document.createElement("TD");

            let date = new Date(item.date);
            date = `${date.getFullYear()}.${date.getMonth()}.${date.getDay()}, ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

            th.textContent = `${date}`
            sortU.textContent = `${item.voltage}`;
            sortI.textContent = `${item.current}`;
            sortC.textContent = `${item.current * item.voltage * item.time / 60}`;
            sortP.textContent = `${item.voltage * item.current}`;
            p_const.textContent = `-`;
            sortTime.textContent = `${item.current * item.voltage * item.time / 60 * item.current}`;

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
