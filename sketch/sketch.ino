#include <ArduinoJson.h>
#define SECONDS 1000

const int VOLTAGE_IN = A0;
const int CURRENT_IN = A2;
const unsigned long MEASURE_DELAY = 5 * SECONDS;
const unsigned long MEASURE_FOR = 10 * SECONDS;

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  randomSeed(analogRead(A0));
}

void measureBattery(){
  float voltage_total = 0.0;
  float current_total = 0.0;
  float temp_total = 0.0;

  unsigned long time_measuring = 0;
  unsigned long start_time = 0;
  unsigned long end_time = 0;

  unsigned long measured_times = 0;

  Serial.println("Start of measurement...");
  start_time = millis();

  while (true){
    float voltage = analogRead(VOLTAGE_IN) * (5.0 / 1023.0);
    float current = (voltage - 2.5) / 0.185; //analogRead(CURRENT_IN);
    float temp = random(195, 220) / 10.0;
    float time = millis();

    voltage_total += voltage;
    current_total += current;
    temp_total += temp;

    measured_times += 1;

    if (time_measuring >= MEASURE_FOR) {
      end_time = millis();
      unsigned long time_spent = end_time - start_time;
      time_spent /= 1000;

      JsonDocument jsdoc;

      jsdoc["voltage"] = voltage_total / float(measured_times);
      jsdoc["current"] = current_total / float(measured_times);
      jsdoc["temperature"] = temp_total / float(measured_times);
      jsdoc["time"] = time_spent;
      
      serializeJson(jsdoc, Serial);
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
  }

  Serial.println("Hi");
  delay(1000);
}

