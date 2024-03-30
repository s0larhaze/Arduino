import objectExporter from "../libs/index.js";

// clearData ожидает, что придет объект с полями: status bool и (reason при ошибке)
// startChecking ожидает, что придет объект с полями: status bool и (reason при ошибке)
// deleteObject ожидает, что придет объект с полями: status bool и (reason при ошибке)
export default class ObjectItem {
    constructor(name, status, parent, timestamp = null) {
        this.name = name;
        this.status = status;
        this.parent = parent;
        this.timestamp = timestamp;
        this.filter = { year: "null", month: "null", day: "null" };

        this.start();
    }

    async start() {
        // Это для перерисовки
        if (this.self) this.self.remove();
        // Получаем данные
        this.data = await this.parent.handleQuery({ type: 'getObjectData', data: {name: this.name}});
        this.id = this.data.id;
        // Если данных нет
        if (this.data && this.data.history) {
            const current = this.data.current || null;

            this.data = this.data.history.sort((a, b) => {return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()});

            this.reference = this.data.pop();
            this.reference.workingHours = (new Date(this.reference.timestamp).getTime() - new Date(this.reference.start_timestamp).getTime()) / 1000 / 60;

            this.data.unshift(this.reference); // Это элемент с самой ранней временной меткой. Предполагается, что это первое измерение и оно же эталон
            if (current) this.data.unshift(current); // Это первый элемент, который существует только при тревоге
        } else {
            this.data = [];
        }

        // Формируем страницу
        // Само окно
        this.self = document.createElement("ASIDE");
        this.self.classList.add("alertWindow");
        this.parent.self.appendChild(this.self);

        this.header = document.createElement("HEADER");
        this.main = document.createElement("MAIN");
        this.back = document.createElement("BUTTON");
        this.startCheck = document.createElement("BUTTON");
        this.changeName = document.createElement("INPUT");
        this.changeNameBut = document.createElement("BUTTON");
        this.clearBut = document.createElement("BUTTON");
        this.deleteBut = document.createElement("BUTTON");
        this.exportToExcelBut = document.createElement("BUTTON");
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
        // Поле с именем
        this.changeName.type = "text";
        this.changeName.name = "changeName";
        this.changeName.classList.add("start_check");
        this.changeName.placeholder = "Имя";
        this.changeName.value = this.name;
        // Кнопка изменения имени
        this.changeNameBut.textContent = "Изменить имя";
        this.changeNameBut.type = "button";
        this.changeNameBut.name = "changeNameBut";
        this.changeNameBut.classList.add("start_check");
        this.changeNameBut.addEventListener('click', (event) => {
            this.changeObjectName();
        });
        // Кнопка сброса данных
        this.clearBut.textContent = "Очистить данные";
        this.clearBut.type = "button";
        this.clearBut.name = "clearBut";
        this.clearBut.classList.add("start_check");
        this.clearBut.disabled = !this.reference;
        this.clearBut.addEventListener('click', (event) => {
            this.clearData();
        });
        // Кнопка удаления объекта
        this.deleteBut.textContent = "Удалить объект";
        this.deleteBut.type = "button";
        this.deleteBut.name = "deleteBut";
        this.deleteBut.classList.add("start_check");
        this.deleteBut.addEventListener('click', (event) => {
            this.deleteObject();
        });
        // Кнопка экспорта данных в таблицу
        this.exportToExcelBut.textContent = "Экспортировать в excel";
        this.exportToExcelBut.type = "button";
        this.exportToExcelBut.name = "exportToExcelBut";
        this.exportToExcelBut.classList.add("start_check");
        this.exportToExcelBut.disabled = !this.reference;
        this.exportToExcelBut.addEventListener('click', (event) => {
            this.exportToExcel();
        });

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
        this.header.appendChild(this.changeName);
        this.header.appendChild(this.changeNameBut);
        this.header.appendChild(this.clearBut);
        this.header.appendChild(this.deleteBut);
        this.header.appendChild(this.exportToExcelBut);

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

    // События объекта
    async changeObjectName() {
        const name = this.changeName.value;
        if (name === this.name) {
            alert("Имя не изменилось");
            return ;
        }
        if (!confirm(`Вы уверены, что хотите изменить имя объекта ${this.name} на ${name}`)) return;
        if (confirm("Сделать экспорт данных в excel?")) this.exportToExcel();

        const result = await this.parent.handleQuery({ type: "changeObjectName", data: {name: this.name, new_name: name, id: this.id}});

        if (result.status) {
            this.name = name;
            this.start();
        } else {
            alert(`Изменить имя не удалось. Причина: ${result.reason}`);
        }
    }

    async clearData() {
        if (!confirm("Вы уверены, что хотите очистить данные об этом объекте?")) return;
        if (confirm("Сделать экспорт данных в excel?")) this.exportToExcel();

        const result = await this.parent.handleQuery({ type: "clearData", data: {name: this.name, id: this.id}});

        if (result.status) {
            this.start();
        } else {
            alert(`Очистить данные о проверке не удалось. Причина: ${result.reason}`);
        }
    }

    async deleteObject() {
        if (!confirm("Вы уверены, что хотите удалить данный объект?")) return;
        if (confirm("Сделать экспорт данных в excel?")) this.exportToExcel();

        const result = await this.parent.handleQuery({ type: "deleteObject", data: {name: this.name, id: this.id}});

        if (result.status) {
            this.finish();
        } else {
            alert(`Удалить объект не удалось. Причина: ${result.reason}`);
        }
    }

    exportToExcel() {
        const data = [...this.data];
        objectExporter({
            exportable: data, // The dataset to be exported form an array of objects, it can also be the DOM name for exporting DOM to html
            type: "csv", // The type of exportable e.g. csv, xls or pdf
            headers: [
                {
                    name: "Name", // Name of the field without space to be used internally
                    alias: "Name", // The name of field which will be visualized in the export
                    flex: 1 // An integer value which shows the relative width of this columns in comparison to the other columns
                }, {
                    name: "Status", // Name of the field without space to be used internally
                    alias: "Status", // The name of field which will be visualized in the export
                    flex: 1 // An integer value which shows the relative width of this columns in comparison to the other columns
                }, {
                    name: "Voltage", // Name of the field without space to be used internally
                    alias: "Voltage", // The name of field which will be visualized in the export
                    flex: 1 // An integer value which shows the relative width of this columns in comparison to the other columns
                }, {
                    name: "Current", // Name of the field without space to be used internally
                    alias: "Current", // The name of field which will be visualized in the export
                    flex: 1 // An integer value which shows the relative width of this columns in comparison to the other columns
                }, {
                    name: "TimeStamp", // Name of the field without space to be used internally
                    alias: "TimeStamp", // The name of field which will be visualized in the export
                    flex: 1 // An integer value which shows the relative width of this columns in comparison to the other columns
                }, {
                    name: "WorkingHours", // Name of the field without space to be used internally
                    alias: "WorkingHours", // The name of field which will be visualized in the export
                    flex: 1 // An integer value which shows the relative width of this columns in comparison to the other columns
                },
            ],
            fileName: `${this.name}_отчет${new Date().getTime()}`,
        })
    }

    async startChecking() {
        if (!confirm("Вы уверены, что хотите начать проверку?")) return;
        // Блокируем кнопку начала проверки
        this.startCheck.disabled = true;

        const result = await this.parent.handleQuery({ type: "startChecking", data: {name: this.name, id: this.id} });
        if (result.status) {
            this.start();
        } else {
            this.startCheck.disabled = false;
            alert(`Запустить проверку не удалось. Причина: ${result.reason}`);
        }
    }

    // Утилитки
    finish() {
        this.self.remove();
    }

    restart() {
        this.parent.self.appendChild(this.self);
    }

    getTimeString(start, end) {
        const time = (end - start) / 1000;
        let hours = (Math.floor(time / 3600) > 9) ? Math.floor(time / 3600) : `0${Math.floor(time / 3600)}`;
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

    // Контентная часть
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
        let days = new Set();

        // Если выбран год
        if (this.filter.year != "null") {
            // Получаем месяцы и дни этого года
            this.data.forEach(item => {
                const date = new Date(item.timestamp);

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
                let date = new Date(item.timestamp);
                months.add(date.getMonth());
            });
        }

        months = Array.from(months).sort((a, b) => { return a - b });

        // Чистим все кроме пустого элемента
        this.selectMonth.querySelectorAll("option").forEach((item, i) => {
            if (item.value == "null") return;
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
                const date = new Date(item.timestamp);

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
                let date = new Date(item.timestamp);
                days.add(date.getDay());
            });
        }

        days = Array.from(days).sort((a, b) => { return a - b });

        // Чистим все кроме пустого элемента
        this.selectDay.querySelectorAll("option").forEach((item, i) => {
            if (item.value == "null") return;
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
                const date = new Date(item.timestamp);

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
            let date = new Date(item.timestamp);

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

        th.textContent = this.name;
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
        if (this.table.querySelector('tbody')) this.table.querySelector('tbody').remove();

        const tbody = document.createElement("TBODY");
        data.forEach((item, i) => {
            const workingHours = document.createElement("TD");
            const degradation  = document.createElement("TD");
            const capacity     = document.createElement("TD");
            const voltage      = document.createElement("TD");
            const current      = document.createElement("TD");
            const status       = document.createElement("TD");
            const power        = document.createElement("TD");
            const tr           = document.createElement("TR");
            const th           = document.createElement("TH");

            if (item.status === 1) {
                item.workingHours = (new Date(item.timestamp).getTime() - new Date(item.start_timestamp).getTime()) / 1000 / 60;
            }

            let date = new Date(item.timestamp);
            date = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDay()}, ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

            th.textContent = `${date}`
            voltage.textContent = `${item.voltage}`;
            current.textContent = `${item.current}`;
            capacity.textContent = (item.workingHours) ? `${(item.current * item.workingHours / 60).toFixed(2)}` : '-';
            power.textContent = `${item.voltage * item.current}`;

            // Расчет деградации
            let degradationInPercent = '-';
            if (item.workingHours) {
                console.log(this.reference);
                let c1 = (item.current * item.workingHours / 60);
                let c2 = (this.reference.current * this.reference.workingHours / 60);
                degradationInPercent = `${(c1 / c2).toFixed(2) * 100}%`;
            }
            degradation.textContent = degradationInPercent;
            // Рассчет времени работы

            let workingHoursDuration = item.workingHours;

            if (item.status === 2) {
                workingHoursDuration = (Math.abs(this.reference.current) * this.reference.workingHours) / Math.abs(item.current);
            }
            workingHoursDuration = `${(Math.floor(workingHoursDuration / 60) > 9)
                ? Math.floor(workingHoursDuration / 60)
                : `0${Math.floor(workingHoursDuration / 60)}`}:${(Math.floor(workingHoursDuration % 60) > 9)
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
