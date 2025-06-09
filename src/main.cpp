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
bool hornActive = false;
unsigned long lastHornToggle = 0;
bool hornState = false;

#define BUZZER_PIN  48  // Còi
#define MOTOR_A1 6 // Chiều quay motor A
#define MOTOR_A2 7 // Chiều quay motor A
#define MOTOR_PA 5 // PWM motor A (chân này PHẢI là chân PWM)

#define MOTOR_B1 16 // Chiều quay motor B
#define MOTOR_B2 17 // Chiều quay motor B
#define MOTOR_PB 15 // PWM motor B (chân này PHẢI là chân PWM)

void Horn() {
    // Phát tiếng còi xe: 2 lần beep ngắn
    for (int i = 0; i < 2; i++) {
        tone(BUZZER_PIN, 1000, 120); // 1000Hz, 120ms
        delay(150);
    }
    noTone(BUZZER_PIN);
}

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
            if (error)
            {
                request->send(400, "application/json", "{\"status\":\"error\",\"msg\":\"Invalid JSON\"}");
                return;
            }

            // Đọc dữ liệu
            // Trạng thái
            String mode = doc["mode"] | "";
            float speed = doc["speed"] | 0.0;
            long timestamp = doc["timestamp"] | 0;
            // nút bấm
            bool btnForward = doc["buttons"]["forward"] | false;
            bool btnBackward = doc["buttons"]["backward"] | false;
            bool btnLeft = doc["buttons"]["left"] | false;
            bool btnRight = doc["buttons"]["right"] | false;
            bool btnHorn = doc["buttons"]["horn"] | false;
            // joystick
            float joyX = doc["joystick"]["x"] | 0.0;
            float joyY = doc["joystick"]["y"] | 0.0;
            float speedA = 0;
            float speedB = 0;

            // Debug
            // Serial.printf("mode=%s, speed=%.2f, joy=(%.2f,%.2f), speedA=%.2f, speedB=%.2f\n",
            // mode.c_str(), speed, joyX, joyY, speedA, speedB);

            // Xử lý điều khiển
            if (btnHorn) {
                hornActive = true;
            } else {
                hornActive = false;
                noTone(BUZZER_PIN);
            }
            if (mode == "button")
            {
                int pwmSpeed = speed * 2.55;
                int leftSpeed = 0;
                int rightSpeed = 0;

                // Tiến/lùi
                if (btnForward)
                {
                    leftSpeed -= pwmSpeed;
                    rightSpeed -= pwmSpeed;
                }
                if (btnBackward)
                {
                    leftSpeed += pwmSpeed;
                    rightSpeed += pwmSpeed;
                }
                // Rẽ trái/phải
                if (btnLeft)
                {
                    leftSpeed += pwmSpeed / 2;
                    rightSpeed -= pwmSpeed / 2;
                }
                if (btnRight)
                {
                    leftSpeed -= pwmSpeed / 2;
                    rightSpeed += pwmSpeed / 2;
                }

                // Giới hạn tốc độ
                leftSpeed = constrain(leftSpeed, -255, 255);
                rightSpeed = constrain(rightSpeed, -255, 255);

                // Điều khiển motor
                if (leftSpeed > 0)
                {
                    digitalWrite(MOTOR_A1, HIGH);
                    digitalWrite(MOTOR_A2, LOW);
                    analogWrite(MOTOR_PA, leftSpeed);
                }
                else
                {
                    digitalWrite(MOTOR_A1, LOW);
                    digitalWrite(MOTOR_A2, HIGH);
                    analogWrite(MOTOR_PA, -leftSpeed);
                }

                if (rightSpeed > 0)
                {
                    digitalWrite(MOTOR_B1, HIGH);
                    digitalWrite(MOTOR_B2, LOW);
                    analogWrite(MOTOR_PB, rightSpeed);
                }
                else
                {
                    digitalWrite(MOTOR_B1, LOW);
                    digitalWrite(MOTOR_B2, HIGH);
                    analogWrite(MOTOR_PB, -rightSpeed);
                }
            }
            if (mode == "joystick")
            {
                float pwmSpeed = speed * 2.55;
                speedA = constrain((joyY + joyX) * pwmSpeed, -255, 255);
                speedB = constrain((joyY - joyX) * pwmSpeed, -255, 255);

                // Điều khiển motor A
                if (speedB > 0)
                {
                    digitalWrite(MOTOR_A1, HIGH);
                    digitalWrite(MOTOR_A2, LOW);
                    analogWrite(MOTOR_PA, speedA);
                }
                else
                {
                    digitalWrite(MOTOR_A1, LOW);
                    digitalWrite(MOTOR_A2, HIGH);
                    analogWrite(MOTOR_PA, -speedA);
                }

                // Điều khiển motor B
                if (speedA > 0)
                {
                    digitalWrite(MOTOR_B1, HIGH);
                    digitalWrite(MOTOR_B2, LOW);
                    analogWrite(MOTOR_PB, speedB);
                }
                else
                {
                    digitalWrite(MOTOR_B1, LOW);
                    digitalWrite(MOTOR_B2, HIGH);
                    analogWrite(MOTOR_PB, -speedB);
                }
            }

                  // Phản hồi lại client
                    JsonDocument respDoc;
                    respDoc["status"] = "ok";
                    respDoc["mode"] = mode;
                    respDoc["speed"] = speed;
                    respDoc["speedA"] = speedA;
                    respDoc["speedB"] = speedB;
                    respDoc["joyX"] = joyX;
                    respDoc["joyY"] = joyY;
                    String respStr;
                    serializeJson(respDoc, respStr);
                    request->send(200, "application/json", respStr);
        });

    server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");
    server.begin();
}

void loop() {
        if (hornActive) {
        unsigned long now = millis();
        if (now - lastHornToggle > 300) { // 200ms kêu, 100ms nghỉ
            hornState = !hornState;
            lastHornToggle = now;
            if (hornState) {
                tone(BUZZER_PIN, 1100, 200); // 1100Hz, 200ms
            } else {
                noTone(BUZZER_PIN);
            }
        }
    } else {
        noTone(BUZZER_PIN);
        hornState = false;
    }
}
