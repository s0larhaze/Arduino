#include <ArduinoJson.h>
#define SECONDS 1000

#define HIGH 0x0
#define LOW 0x1

const int VOLTAGE_IN = A0;
const int CURRENT_IN = A0;
const unsigned long MEASURE_DELAY = 5 * SECONDS;
const unsigned long MEASURE_FOR = 10 * SECONDS;
const unsigned long MOCK_EMERGENCY_LIMIT = 20 * SECONDS;

const unsigned int OBJECT_ID = 1;

enum class MessageType{
  MESSAGE_STARTED_MEASURING = 0,
  MESSAGE_FINISHED_MEASURING = 1,
  MESSAGE_EMERGENCY = 2
};

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  randomSeed(analogRead(A0));
}

void emergency() {
  unsigned long emergency_time = 0;

  float voltage = analogRead(VOLTAGE_IN) * (5.0 / 1023.0);
  float current = (voltage - 2.5) / 0.185; //analogRead(CURRENT_IN);

  while (emergency_time < MOCK_EMERGENCY_LIMIT){
      digitalWrite(LED_BUILTIN, HIGH);
      delay(10);
      digitalWrite(LED_BUILTIN, LOW);
      JsonDocument jsdoc;

      jsdoc["message_type"] = int(MessageType::MESSAGE_EMERGENCY);
      jsdoc["object_id"] = OBJECT_ID;
      jsdoc["voltage"] = voltage;
      jsdoc["current"] = current;

      serializeJson(jsdoc, Serial);
      Serial.println("");
      delay(MEASURE_DELAY);
      emergency_time += MEASURE_DELAY;
  }
}

void measureBattery(){
  float voltage_total = 0.0;
  float current_total = 0.0;

  unsigned long time_measuring = 0;
  unsigned long measured_times = 0;

  digitalWrite(LED_BUILTIN, HIGH);
  JsonDocument measurementStart;
  Serial.printf("{ \"message_type\": 0, \"object_id\": %i }\n", OBJECT_ID);

  while (true){
    float voltage = analogRead(VOLTAGE_IN) * (5.0 / 1023.0);
    float current = (voltage - 2.5) / 0.185; //analogRead(CURRENT_IN);

    voltage_total += voltage;
    current_total += current;

    measured_times += 1;

    if (time_measuring >= MEASURE_FOR) {
      JsonDocument jsdoc;

      jsdoc["message_type"] = 1;
      jsdoc["object_id"] = OBJECT_ID;
      jsdoc["avg_voltage"] = voltage_total / float(measured_times);
      jsdoc["avg_current"] = current_total / float(measured_times);

      digitalWrite(LED_BUILTIN, LOW);
      serializeJson(jsdoc, Serial);
      Serial.println("");
      break;
    }

    delay(MEASURE_DELAY);
    time_measuring += MEASURE_DELAY;
  }
}

void handleEmergency(){
  return;
}

void loop() {

  String cmd = Serial.readString();

  if (cmd == "measure"){
      measureBattery();
  } else if (cmd == "hello") {
      Serial.println("Hello");
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
      digitalWrite(LED_BUILTIN, LOW);
      delay(100);
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
      digitalWrite(LED_BUILTIN, LOW);
      delay(100);
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
      digitalWrite(LED_BUILTIN, LOW);
      Serial.println("elseif");
      delay(100);
  } else if (cmd == "bruh"){
    while (true)
    {
      Serial.println("Wusap");
      digitalWrite(LED_BUILTIN, LOW);
      delay(50);
      digitalWrite(LED_BUILTIN, HIGH);
      delay(50);
    }
  }else if (cmd == "emergency"){
      emergency();
  }

  Serial.println("Hi");
  delay(1000);
}

