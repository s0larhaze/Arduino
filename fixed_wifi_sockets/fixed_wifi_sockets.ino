#include <ArduinoWebsockets.h>
#include <ESP8266WiFi.h>

const char* ssid = "Resight";
const char* password = "Res454569";
const char* serverAddress = "192.168.216.231";
const int serverPort = 3000; // Assuming your server is running on port 3000

using namespace websockets;
WebsocketsClient client;

void onMessageCallback(WebsocketsMessage message) {
    Serial.println("Received message from server: " + message.data());
}

void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }

    Serial.println("Connected to WiFi");

    client.onMessage(onMessageCallback);
    client.connect("ws://192.168.216.231:3000");
    client.disconnect();

    // You can send messages to the server using client.send() method
    // client.send("Hello from ESP8266!");
}

void loop() {
    client.poll();
}
