#include <Arduino.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
// #include <DNSServer.h>
#ifdef ESP32
#include <WiFi.h>
#include <AsyncTCP.h>
#elif defined(ESP8266)
#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#endif
#include "ESPAsyncWebServer.h"

// DNSServer dnsServer;
AsyncWebServer server(80);

const char *ssid = "メカ MECHA KAN";
const char *password = "12345678";

// Chân kết nối driver motor
#define MOTOR_A1 6 // Chiều quay motor A
#define MOTOR_A2 7 // Chiều quay motor A
#define MOTOR_PA 5 // PWM motor A (chân này PHẢI là chân PWM)

#define MOTOR_B1 16 // Chiều quay motor B
#define MOTOR_B2 17 // Chiều quay motor B
#define MOTOR_PB 15 // PWM motor B (chân này PHẢI là chân PWM)

void setup()
{
  Serial.begin(115200);

  if (!SPIFFS.begin(true))
  {
    Serial.println("SPIFFS Mount Failed");
    return;
  }

  // Khai báo OUTPUT cho các chân motor
  pinMode(MOTOR_A1, OUTPUT);
  pinMode(MOTOR_A2, OUTPUT);
  pinMode(MOTOR_PA, OUTPUT);
  pinMode(MOTOR_B1, OUTPUT);
  pinMode(MOTOR_B2, OUTPUT);
  pinMode(MOTOR_PB, OUTPUT);

  WiFi.softAP(ssid);

  server.on("/control", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
  {
    Serial.println("Đã nhận request /control");
    // Parse JSON
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, data, len);
    if (error) {
      request->send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Invalid JSON\"}");
      return;
    }

    // Đọc dữ liệu
    // Trạng thái
    String mode = doc["mode"] | "";
    float throttle = doc["throttle"] | 0.0;
    long timestamp = doc["timestamp"] | 0;
    // nút bấm
    bool btnForward  = doc["buttons"]["forward"]  | false;
    bool btnBackward = doc["buttons"]["backward"] | false;
    bool btnLeft     = doc["buttons"]["left"]     | false;
    bool btnRight    = doc["buttons"]["right"]    | false;
    bool btnHorn     = doc["buttons"]["horn"]     | false;
    // joystick
    float joyX = doc["joystick"]["x"] | 0.0;
    float joyY = doc["joystick"]["y"] | 0.0;
    float speedA = 0;
    float speedB = 0;

    // Debug
    //Serial.printf("mode=%s, throttle=%.2f, joy=(%.2f,%.2f), speedA=%.2f, speedB=%.2f\n",
    //mode.c_str(), throttle, joyX, joyY, speedA, speedB);

    // Xử lý điều khiển
    if (btnHorn) {
    }
    if (mode == "button") {
    int pwmThrottle = throttle * 2.55;
    int leftSpeed = 0;
    int rightSpeed = 0;

    // Tiến/lùi
    if (btnForward) {
        leftSpeed  -= pwmThrottle;
        rightSpeed -= pwmThrottle;
    }
    if (btnBackward) {
        leftSpeed  += pwmThrottle;
        rightSpeed += pwmThrottle;
    }
    // Rẽ trái/phải
    if (btnLeft) {
        leftSpeed  += pwmThrottle / 2;
        rightSpeed -= pwmThrottle / 2;
    }
    if (btnRight) {
        leftSpeed  -= pwmThrottle / 2;
        rightSpeed += pwmThrottle / 2;
    }

    // Giới hạn tốc độ
    leftSpeed  = constrain(leftSpeed,  -255, 255);
    rightSpeed = constrain(rightSpeed, -255, 255);

    // Điều khiển motor
    if (leftSpeed > 0) {
        digitalWrite(MOTOR_A1, HIGH);
        digitalWrite(MOTOR_A2, LOW);
        analogWrite(MOTOR_PA, leftSpeed);
    } else {
        digitalWrite(MOTOR_A1, LOW);
        digitalWrite(MOTOR_A2, HIGH);
        analogWrite(MOTOR_PA, -leftSpeed);
    }

    if (rightSpeed > 0) {
        digitalWrite(MOTOR_B1, HIGH);
        digitalWrite(MOTOR_B2, LOW);
        analogWrite(MOTOR_PB, rightSpeed);
    } else {
        digitalWrite(MOTOR_B1, LOW);
        digitalWrite(MOTOR_B2, HIGH);
        analogWrite(MOTOR_PB, -rightSpeed);
    }
}
    if (mode == "joystick") {
    float pwmThrottle = throttle * 2.55; 
    speedA = constrain((joyY + joyX) * pwmThrottle, -255, 255);
    speedB = constrain((joyY - joyX) * pwmThrottle, -255, 255);

    // Điều khiển motor A
    if (speedB > 0) {
        digitalWrite(MOTOR_A1, HIGH);
        digitalWrite(MOTOR_A2, LOW);
        analogWrite(MOTOR_PA, speedA);
    } else {
        digitalWrite(MOTOR_A1, LOW);
        digitalWrite(MOTOR_A2, HIGH);
        analogWrite(MOTOR_PA, -speedA);
    }

    // Điều khiển motor B
    if (speedA > 0) {
        digitalWrite(MOTOR_B1, HIGH);
        digitalWrite(MOTOR_B2, LOW);
        analogWrite(MOTOR_PB, speedB);
    } else {
        digitalWrite(MOTOR_B1, LOW);
        digitalWrite(MOTOR_B2, HIGH);
        analogWrite(MOTOR_PB, -speedB);
    }

    }

      // Phản hồi lại client
      JsonDocument respDoc;
      respDoc["status"] = "ok";
      respDoc["mode"] = mode;
      respDoc["throttle"] = throttle;
      respDoc["speedA"] = speedA;
      respDoc["speedB"] = speedB;
      respDoc["joyX"] = joyX;
      respDoc["joyY"] = joyY;
      String respStr;
      serializeJson(respDoc, respStr);
      request->send(200, "application/json", respStr); });

  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");
  server.begin();
}

void loop() {}
