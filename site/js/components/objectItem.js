export default class ObjectItem {
    constructor(name, status, parent) {
        this.id = name;
        this.status = status;
        this.parent = parent;

        this.start();
    }

    start() {
        this.self = document.createElement("ASIDE");
        this.self.classList.add("alertWindow");
        this.parent.self.appendChild(this.self);

        const back = document.createElement("BUTTON");
        back.textContent = "Назад";
        this.self.appendChild(back);
        back.addEventListener('click', (event) => {
            this.finish();
        });
    }

    finish() {
        this.self.remove();
        this.parent.cleareObjectItem();
    }
}
