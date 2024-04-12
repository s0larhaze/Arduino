#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <string.h>


#define SECONDS 1000

const int VOLTAGE_IN = A0;
const int CURRENT_IN = A1;
const unsigned long MEASURE_DELAY = 30 * SECONDS;
const unsigned long MEASURE_FOR = 3 * SECONDS;
const unsigned long MOCK_EMERGENCY_LIMIT = 20 * SECONDS;

const int averageValue = 500;
bool isEmergency = 0;

int OBJECT_ID = 1;

void emergency() {
  unsigned long emergency_time = 0;

  float voltage = analogRead(VOLTAGE_IN) * (14.0 / 1023.0);
  float current = ((analogRead(CURRENT_IN) * 5.0 / 1023.0) - 2.535) / 0.185;  //analogRead(CURRENT_IN);

  //while (emergency_time < MOCK_EMERGENCY_LIMIT) {
  JsonDocument jsdoc;

  jsdoc["type"] = "arduinoEmergency";
  jsdoc["data"]["id"] = OBJECT_ID;
  jsdoc["data"]["voltage"] = voltage;
  jsdoc["data"]["current"] = current;
  String jsdocSerialized;
  serializeJson(jsdoc, jsdocSerialized);

  Serial.println(jsdocSerialized);

  delay(60000);

  // delay(MEASURE_DELAY);
  // emergency_time += MEASURE_DELAY;
}

void measureBattery() {
  float voltage_mean = 0.0;
  float current_mean = 0.0;
  long int sensorValue; // Делим полученное значение 
  long int sensorValue2;

  unsigned long time_measuring = 0;
  unsigned long measured_times = 0;

  JsonDocument startMeasurementData;
  JsonDocument data;

  data["id"] = OBJECT_ID;
  String serializedData;
  serializeJson(data, serializedData);

  startMeasurementData["type"] = "arduinoStartedMeasurement";
  startMeasurementData["data"]["id"] = OBJECT_ID;
  String serializedSMD;
  serializeJson(startMeasurementData, serializedSMD);

  Serial.println(serializedSMD);

  while (true) {
    sensorValue = analogRead(VOLTAGE_IN); // Делим полученное значение 
    sensorValue2 = analogRead(CURRENT_IN);
    float voltage = sensorValue * 14.0 / 1024.0;     // Расчет напряжения
    float voltage2 = sensorValue2 * 5.0 / 1024.0;
    float current = (voltage2 - 2.535) / 0.185;        // Расчет тока

    // float voltage = analogRead(VOLTAGE_IN) * (14.0 / 1023.0);
    // float current = (analogRead(A0) - 7.0) / 0.185;  //analogRead(CURRENT_IN);
    // Serial.println(analogRead(A1) * (5.0) / 1023.0);
    // Serial.print("A0 ");
    // Serial.println(analogRead(A0));
    // Serial.print("VOLTAGE ");
    // Serial.println(voltage);

    measured_times += 1;

    voltage_mean += (voltage - voltage_mean) / float(measured_times);
    current_mean += (current - current_mean) / float(measured_times);

    delay(MEASURE_DELAY);
    if (voltage <= 10.9) {
      JsonDocument jsdoc;

      jsdoc["message_type"] = 1;
      jsdoc["id"] = OBJECT_ID;
      jsdoc["avg_voltage"] = voltage_mean;
      jsdoc["avg_current"] = current_mean;
      String jsonStringified;

      digitalWrite(LED_BUILTIN, LOW);
      serializeJson(jsdoc, jsonStringified);
      // Serial.println(jsonStringified);
      Serial.println("{ \"type\": \"arduinoFinishedMeasurement\", \"data\": " + jsonStringified + " }");
      break;
    }

    Serial.println("{ \"type\": \"arduinoChtoto\", \"data\": " + String(voltage) + " }");
    time_measuring += (MEASURE_DELAY / 1000);
  }
}

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);  
  pinMode(12, INPUT);  
  // measureBattery();
}

void loop() {
  // put your main code here, to run repeatedly:

  // measureBattery();

  // delay(1000);

  // digitalWrite(LED_BUILTIN, HIGH);
  // delay(1000);
  // digitalWrite(LED_BUILTIN, LOW);
  // delay(1000);


  if (Serial.available() > 0){
    String message = Serial.readString();

    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, message);
    if (!error) {
      if (strcmp(doc["type"], "executePlannedMeasurement") == 0){
        digitalWrite(LED_BUILTIN, HIGH);
      }
    }
  }

  int twPin = digitalRead(12);

  if (twPin == LOW){
    emergency();
    isEmergency = 1;
  }

  if (twPin == HIGH && isEmergency == 1){
    isEmergency = 0;

    JsonDocument jsdoc;
    jsdoc["id"] = OBJECT_ID;
    String jsonStringified;

    serializeJson(jsdoc, jsonStringified);
    Serial.println("{ \"type\": \"arduinoEmergencyStopped\", \"data\": " + jsonStringified + " }");
  }

  if (digitalRead(LED_BUILTIN) == HIGH){
    measureBattery();
  }


  delay(100);

  // if (Serial.available() > 0) {

  //   DynamicJsonDocument doc(1024);
  //   DeserializationError error = deserializeJson(doc, message);
  //   if (error) {
  //     // Serial.print("Failed to parse JSON: "); // FOR TESTING PURPOSES
  //     // Serial.println(error.c_str());
  //     // return;
  //   }

  //   const char* type = doc["type"];
  //   const char* data = doc["data"];

  //   if (strcmp(type, "executePlannedMeasurement") == 0) {
  //     digitalWrite(LED_BUILTIN, HIGH);
  //   }
  // }
}