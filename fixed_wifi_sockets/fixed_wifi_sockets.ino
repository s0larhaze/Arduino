#include <ArduinoJson.h>
#include <ArduinoWebsockets.h>
#include <ESP8266WiFi.h>

#define SECONDS 1000

#define HIGH 0x0
#define LOW 0x1

const int VOLTAGE_IN = A0;
const int CURRENT_IN = A0;
const unsigned long MEASURE_DELAY = 5 * SECONDS;
const unsigned long MEASURE_FOR = 5 * SECONDS;
const unsigned long MOCK_EMERGENCY_LIMIT = 20 * SECONDS;

bool cringe = false;

int OBJECT_ID = 1;

// enum class MessageType {
//   MESSAGE_STARTED_MEASURING = 0,
//   MESSAGE_FINISHED_MEASURING = 1,
//   MESSAGE_EMERGENCY = 2
// };

const char* ssid = "Resight";
const char* password = "Res454569";

using namespace websockets; WebsocketsClient client;

void onMessageCallback(WebsocketsMessage message) {
  Serial.println("HI");
  Serial.println("Message: " + message.data());

  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message.data());
  if (error) {
    Serial.print("Failed to parse JSON: ");
    Serial.println(error.c_str());
    return;
  }

  const char* type = doc["type"];
  const char* data = doc["data"];

  Serial.print("Type: ");
  Serial.println(type);
  Serial.print("data: ");
  Serial.println(data);

  // Bruh, not working
  if (strcmp(type, "executePlannedMeasurement") == 0) {
    Serial.println("{ type: \"executePlannedMeasurement\" }");
  }

  if (strcmp(type, "startMockEmergency") == 0) {
    Serial.println("Emergency event triggered");
    // emergency();
  }
}

void onEventsCallback(WebsocketsEvent event, String data) {
  if (event == WebsocketsEvent::ConnectionOpened) {
    Serial.println("Connnection Opened");

    JsonDocument regInfo;
    regInfo["type"] = "arduinoObjectRegistration";
    regInfo["data"]["id"] = OBJECT_ID;
    String regInfoSerialized;
    serializeJson(regInfo, regInfoSerialized);

    client.send(regInfoSerialized);
  } 
  else if (event == WebsocketsEvent::ConnectionClosed) {
    Serial.println("Connnection Closed");
    while (!client.available()) {
      Serial.println("Trying to form a socket connection...");
      client.connect("ws://147.45.101.134:3000/");
      delay(1000);
    }
  } 
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.println("Connecting to WiFi...");
    delay(1000);
  }
  Serial.println("Connected to WiFi");

  client.onMessage(onMessageCallback);
  client.onEvent(onEventsCallback);
  client.connect("ws://147.45.101.134:3000/");

  // You can send messages to the server using client.send() method
}

void loop() {
  client.poll();

  if (Serial.available() > 0) {
    String message = Serial.readString();
    if (strcmp(message.c_str(), "Failed to parse JSON: InvalidInput"))
      client.send(message);
  }
}