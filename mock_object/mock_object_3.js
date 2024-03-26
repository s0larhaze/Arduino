const { WebSocket } = require('ws');

let socket = new WebSocket('ws://localhost:3000');

function sendMessage(messageType, data) {
    const message = {
        type: messageType,
        data: data
    };
    socket.send(JSON.stringify(message));
}

socket.on("open", client => {

    registerObject = () => {
        return new Promise((resolve, reject) => {
            sendMessage('arduinoObjectRegistration', { object_id: 3 });
            resolve(true);
        });
    }


    registerObject()
        .then((response) => {
            console.log(response);
        })
        .catch(err => {
            console.log(err);
        });

})

socket.on("message", message => {
    console.log(message);
})
