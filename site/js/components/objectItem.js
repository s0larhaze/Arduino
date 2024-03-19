export default class ObjectItem {
    constructor(name, status, parent, timestamp = null) {
        this.id = name;
        this.status = status;
        this.parent = parent;
        this.timestamp = timestamp;
        this.filter = {year: "null", month: "null", day: "null"};

        this.start();
    }

    async start() {
        // Получаем данные
        this.data = await this.parent.handleQuery({type: 'getObjectData', name: this.id});
        const current = this.data.current;
        this.data = this.data.history.sort((a, b) => {return a.timestamp - b.timestamp});
        this.reference = this.data.shift();
        for (let i = this.data.length - 1; i > 0; i--) {
            if (this.data[i].status === 1) {
                this.lastMeasurement = this.data[i];
                break;
            }
        }
        this.data.unshift(this.reference); // Это элемент с самой ранней временной меткой. Предполагается, что это первое измерение и оно же эталон
        if (current) this.data.unshift(current); // Это первый элемент, который существует только при тревоге


        // Формируем страницу
        // Само окно
        this.self = document.createElement("ASIDE");
        this.self.classList.add("alertWindow");
        this.parent.self.appendChild(this.self);

        this.header = document.createElement("HEADER");
        this.main = document.createElement("MAIN");
        this.back = document.createElement("BUTTON");
        this.startCheck = document.createElement("BUTTON");
        this.timer = document.createElement("SPAN");
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
        this.startCheck.disabled = !!this.status;
        this.startCheck.addEventListener('click', (event) => {
            this.startChecking();
        });

        // Таймер
        this.timer.textContent = "00:00:00";
        this.timer.classList.add("timer");
        this.startTimer();

        // Контейнеры
        this.selectTimeline.classList.add("selectTimeline");
        this.tableContainer.classList.add("table_container");

        // Выбор года
        this.selectYear.name = "year";
        this.selectYear.classList.add("select_year");
        this.selectYear.addEventListener("change", (event) => {
            this.setFilter(event.target.name, event.target.value);
        })

        // Выбор месяца
        this.selectMonth.name = "month";
        this.selectMonth.classList.add("select_month");
        this.selectMonth.addEventListener("change", (event) => {
            this.setFilter(event.target.name, event.target.value);
        })

        // Выбор дня
        this.selectDay.name = "day";
        this.selectDay.classList.add("select_day");
        this.selectDay.addEventListener("change", (event) => {
            this.setFilter(event.target.name, event.target.value);
        })

        this.fillSelect();

        // Таблица
        this.fillTableHead();
        this.fillTableBody(this.data);

        // Заполняем шапку
        this.header.appendChild(this.back);
        this.header.appendChild(this.timer);
        this.header.appendChild(this.startCheck);

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
        // Блокируем кнопку начала проверки
        this.startCheck.disabled = true;

        // Просим сервер запустить проверку.

        // Ловим ответ

        // Делаем что-то, в зависимости от ответа
    }

    getTimeString(start, end) {
        const time = (end - start) / 1000;
        let hours   = (Math.floor(time / 3600) > 9) ? Math.floor(time / 3600) : `0${Math.floor(time / 3600)}`;
        let minutes = (Math.floor((time % 3600) / 60) > 9) ? Math.floor((time % 3600) / 60) : `0${Math.floor((time % 3600) / 60)}`;
        let seconds = (Math.floor(time % 60) > 9) ? Math.floor(time % 60) : `0${Math.floor(time % 60)}`;

        return `${hours}:${minutes}:${seconds}`;
    }

    startTimer() {
        if (!this.timestamp) return;

        setInterval(() => {
            const date = new Date().getTime();

            this.timer.textContent = this.getTimeString(this.timestamp, date);
        }, 1000);
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

    fillSelect() {
        // Получаем данные
        // Начальное значение
        let yOption = document.createElement("OPTION");
            yOption.textContent = "Выберите год";
            yOption.value = null;
            this.selectYear.appendChild(yOption);

        let mOption = document.createElement("OPTION");
            mOption.textContent = "Выберите месяц";
            mOption.value = null;
            this.selectMonth.appendChild(mOption);

        let dOption = document.createElement("OPTION");
            dOption.textContent = "Выберите день";
            dOption.value = null;
            this.selectDay.appendChild(dOption);

        let ySet = new Set();
        let mSet = new Set();
        let dSet = new Set();

        this.data.forEach(item => {
            let date = new Date(item.date);

            ySet.add(date.getFullYear());
            mSet.add(date.getMonth());
            dSet.add(date.getDay());
        });

        // Сортировка
        ySet = Array.from(ySet).sort((a, b) => { return a - b });
        mSet = Array.from(mSet).sort((a, b) => { return a - b });
        dSet = Array.from(dSet).sort((a, b) => { return a - b });

        ySet.forEach((item, i) => {
            yOption = document.createElement("OPTION");
            yOption.textContent = item;
            yOption.value = item;
            this.selectYear.appendChild(yOption);
        });

        mSet.forEach((item, i) => {
            switch (item) {
                case 0:
                    item = "Январь"
                    break;
                case 1:
                    item = "Февраль"
                    break;
                case 2:
                    item = "Март"
                    break;
                case 3:
                    item = "Апрель"
                    break;
                case 4:
                    item = "Май"
                    break;
                case 5:
                    item = "Июнь"
                    break;
                case 6:
                    item = "Июль"
                    break;
                case 7:
                    item = "Август"
                    break;
                case 8:
                    item = "Сентябрь"
                    break;
                case 9:
                    item = "Октябрь"
                    break;
                case 10:
                    item = "Ноябрь"
                    break;
                default:
                    item = "Декабрь"
            }
            mOption = document.createElement("OPTION");
            mOption.textContent = item;
            mOption.value = item;
            this.selectMonth.appendChild(mOption);
        });

        dSet.forEach((item, i) => {
            dOption = document.createElement("OPTION");
            dOption.textContent = item;
            dOption.value = item;
            this.selectDay.appendChild(dOption);
        });
    }

    fillTableHead() {
        const thead = document.createElement("THEAD");
        const tr = document.createElement("TR");
        const th = document.createElement("TH");
        const voltage = document.createElement("TD");
        const current = document.createElement("TD");
        const capacity = document.createElement("TD");
        const power = document.createElement("TD");
        const degradation = document.createElement("TD");
        const workingHours = document.createElement("TD");
        const status = document.createElement("TD");

        th.textContent = this.id;
        voltage.textContent = "Напряжение U(В)";
        current.textContent = "Сила тока I(A)";
        capacity.textContent = "Емкость C(А/ч)";
        power.textContent = "Мощность P(Вт)";
        degradation.textContent = "Деградация %";
        workingHours.textContent = "Время работы";
        status.textContent = "Статус";

        this.table.appendChild(thead);
        thead.appendChild(tr);
        tr.appendChild(th);
        tr.appendChild(voltage);
        tr.appendChild(current);
        tr.appendChild(capacity);
        tr.appendChild(power);
        tr.appendChild(degradation);
        tr.appendChild(workingHours);
        tr.appendChild(status);
        tr.classList.add('table_heading');

    }

    fillTableBody(data) {
        // Если таблица уже существует
        if(this.table.querySelector('tbody')) this.table.querySelector('tbody').remove();

        const tbody = document.createElement("TBODY");
        data.forEach((item, i) => {
            const tr = document.createElement("TR");
            const th = document.createElement("TH");
            const voltage = document.createElement("TD");
            const current = document.createElement("TD");
            const capacity = document.createElement("TD");
            const power = document.createElement("TD");
            const degradation = document.createElement("TD");
            const workingHours = document.createElement("TD");
            const status = document.createElement("TD");


            let date = new Date(item.date);
            date = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDay()}, ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

            th.textContent = `${date}`
            voltage.textContent = `${item.voltage}`;
            current.textContent = `${item.current}`;
            capacity.textContent = (item.workingHours) ? `${(item.current * item.workingHours / 60).toFixed(2)}` : '-';
            power.textContent = `${item.voltage * item.current}`;
            // Расчет деградации
            let degradationInPercent = '-';
            if (item.workingHours) {
                let c1 = (item.current * item.workingHours / 60);
                let c2 = (this.reference.current * this.reference.workingHours / 60);
                degradationInPercent = `${(c1 / c2).toFixed(2) * 100}%`;
            }
            degradation.textContent = degradationInPercent;
            // Рассчет времени работы

            let workingHoursDuration = item.workingHours;
            if (item.status === 2) {
                workingHoursDuration = (this.lastMeasurement.current * this.lastMeasurement.workingHours) / item.current;
            }
            workingHoursDuration = `${
                (Math.floor(workingHoursDuration / 60) > 9)
                    ? Math.floor(workingHoursDuration / 60)
                    : `0${Math.floor(workingHoursDuration / 60)}`}:${
                (Math.floor(workingHoursDuration % 60) > 9)
                    ? Math.floor(workingHoursDuration % 60)
                    : `0${Math.floor(workingHoursDuration % 60)}`}`;

            workingHours.textContent = workingHoursDuration;
            // Обратный отсчет у тревожной записи
            if (i === 0 && item.status === 2) {
                setInterval(() => {
                    let hours = +workingHours.textContent.split(":")[0];
                    let minutes = +workingHours.textContent.split(":")[1];
                    if (--minutes < 0) {
                        hours -= 1;
                        minutes = 59;
                    }
                    if (hours >= 0) {
                        workingHours.textContent = `${(hours < 9) ? `0${hours}` : hours}:${(minutes < 9) ? `0${minutes}` : minutes}`;
                    }
                }, 60000);
            }
            status.textContent = (item.status === 2) ? "Тревога" : "Проверка";

            this.table.appendChild(tbody);
            tbody.appendChild(tr);
            tr.appendChild(th);
            tr.appendChild(voltage);
            tr.appendChild(current);
            tr.appendChild(capacity);
            tr.appendChild(power);
            tr.appendChild(degradation);
            tr.appendChild(workingHours);
            tr.appendChild(status);
        });

    }
}
