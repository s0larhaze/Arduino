#include <ESP8266WiFi.h>

const char* ssid     = "****";
const char* password = "****";

WiFiServer server(80);
String header;

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  WiFi.begin(ssid, password);
  
  Serial.print("Connecting to ");
  Serial.print(ssid); 
  Serial.println(" ...");

  int i = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Trying to connect...");
  }

  Serial.println('\n');
  Serial.println("Connection established!");  
  Serial.print("IP address:\t");
  Serial.println(WiFi.localIP());
  server.begin();
}

void loop() {
  WiFiClient client = server.available();

  if (client) {
    Serial.println("New user has connected!");
    String currentLine = "";
    
    while (client.connected()){
      if (client.available()){    
        if (currentLine.length() == 0) {
          client.println("HTTP/1.1 200 OK");
          client.println("Content-type:text/html");
          client.println("Connection: close");
          client.println("Hello!");
          client.println();
          delay(1000);
        }
      }
    }
  }
}

// esp8266
// 2015-08
// wemos
// esp8266mod
// d1