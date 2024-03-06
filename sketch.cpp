
void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  randomSeed(analogRead(A0));
}

void loop() {
  int value = analogRead(A3);

  long temp = random(-215, -195);

  float voltage = value * (5.0 / 1023.0);
  float current = (voltage - 2.5) / 0.185;
  // float resistance = voltage / current;

  Serial.print(voltage);
  Serial.print(";");
  Serial.print(current);
  Serial.print(";");
  // Serial.println(resistance);
  Serial.println(temp / 10.0);
  delay(1000);
}

