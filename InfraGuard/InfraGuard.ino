#include <Wire.h>
#include <MPU6050.h>
#include <DHT.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ============== OLED DEFINITIONS ==============
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C  // Usually 0x3C, try 0x3D if not working

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ============== OBJECTS ==============
MPU6050 mpu;
DHT dht(4, DHT11);  // DHT11 on GPIO 4

// ============== PIN DEFINITIONS ==============
#define PIR_PIN 19
#define LDR_ANALOG_PIN 34
#define TRIG_PIN 5 // Ultrasonic ECHO on 5
#define ECHO_PIN 18 // Ultrasonic ECHO on 18
#define RAIN_SENSOR_PIN 35  // Rain sensor on GPIO 35 (ADC)

// OUTPUTS
#define RELAY1_PIN 25
#define RELAY2_PIN 26
#define BUZZER_PIN 27

// ============== VARIABLES ==============
int16_t ax, ay, az;
float tilt_x, tilt_y;
float temperature, humidity;
int light_level;
int motion_detected;
long duration;
float distance_cm;
int rain_value;  // Rain sensor value

const float TILT_THRESHOLD = 5.0;
const int LIGHT_THRESHOLD = 500;
const int RAIN_THRESHOLD = 2000;  // Adjust based on testing

// ============== SETUP ==============
void setup() {
  Serial.begin(115200);
  Serial.println("=== INFRA GUARD STARTING ===");
  
  Wire.begin();
  
  // ===== OLED DISPLAY =====
  Serial.print("OLED: ");
  if(!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("FAILED - Check I2C address");
  } else {
    Serial.println("OK");
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println("InfraGuard");
    display.println("By Team ZenithByte");
    display.println("Starting...");
    display.display();
    delay(2000);
  }
  
  // ===== MPU6050 =====
  Serial.print("MPU6050: ");
  mpu.initialize();
  if(mpu.testConnection()) {
    Serial.println("OK");
  } else {
    Serial.println("FAILED");
  }
  
  // ===== DHT11 =====
  dht.begin();
  Serial.println("DHT11: OK");
  
  // ===== PIN MODES =====
  pinMode(PIR_PIN, INPUT);
  pinMode(LDR_ANALOG_PIN, INPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RAIN_SENSOR_PIN, INPUT);
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // ===== INITIAL STATES =====
  digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(RELAY2_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  
  Serial.println("Setup complete!");
  
  // Show ready on OLED
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("InfraGuard");
  display.println("Ready!");
  display.println("All sensors OK");
  display.display();
  delay(1000);
}

// ============== LOOP ==============
void loop() {
  // Read all sensors
  readMPU6050();
  readDHT11();
  readLDR();
  readPIR();
  readUltrasonic();
  readRainSensor();  // New rain sensor
  
  // Calculate risk
  int risk_level = calculateRisk();
  
  // Control outputs
  controlLight();
  controlBuzzer(risk_level);
  
  // Update displays
  updateOLED(risk_level);  // LCD ki jagah OLED
  printToSerial(risk_level);
  
  delay(1000);  // 1 second delay
}

// ============== SENSOR FUNCTIONS ==============

void readMPU6050() {
  mpu.getAcceleration(&ax, &ay, &az);
  tilt_x = atan2(ay, az) * 180 / PI;
  tilt_y = atan2(ax, az) * 180 / PI;
}

void readDHT11() {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 read failed!");
    temperature = 0;
    humidity = 0;
  }
}

void readLDR() {
  light_level = analogRead(LDR_ANALOG_PIN);
}

void readPIR() {
  motion_detected = digitalRead(PIR_PIN);
}

void readUltrasonic() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  duration = pulseIn(ECHO_PIN, HIGH);
  distance_cm = duration * 0.034 / 2;
  
  if (distance_cm > 400 || distance_cm < 2) {
    distance_cm = 0;
  }
}

// ===== NEW RAIN SENSOR FUNCTION =====
void readRainSensor() {
  rain_value = analogRead(RAIN_SENSOR_PIN);
  0 = dry, 4095 = completely wet (for ESP32)
}

// ============== RISK CALCULATION ==============

int calculateRisk() {
  int risk = 0;  // 0 = SAFE, 1 = WARNING, 2 = CRITICAL
  
  // Tilt check
  if (abs(tilt_x) > TILT_THRESHOLD) {
    risk = 2;  // CRITICAL
  }
  
  // Rain check
  if (rain_value > RAIN_THRESHOLD) {
    risk = max(risk, 1);  // At least WARNING
  }
  
  // Temperature check
  if (temperature > 45 || temperature < 5) {
    risk = max(risk, 1);
  }
  
  // Water level check (ultrasonic)
  if (distance_cm < 10 && distance_cm > 0) {
    risk = max(risk, 1);
  }
  
  return risk;
}

// ============== OUTPUT CONTROL ==============

void controlLight() {
  if (light_level < LIGHT_THRESHOLD) {
    digitalWrite(RELAY1_PIN, HIGH);  // Light ON
  } else {
    digitalWrite(RELAY1_PIN, LOW);   // Light OFF
  }
}

void controlBuzzer(int risk_level) {
  if (risk_level == 2) {
    // Critical - fast beep
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  } else if (risk_level == 1) {
    // Warning - slow beep
    digitalWrite(BUZZER_PIN, HIGH);
    delay(300);
    digitalWrite(BUZZER_PIN, LOW);
    delay(300);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }
}

// ============== OLED DISPLAY ==============

void updateOLED(int risk_level) {
  display.clearDisplay();
  
  // Line 1: Title + Risk
  display.setCursor(0, 0);
  display.print("InfraGuard");
  
  // Show risk symbol
  display.setCursor(100, 0);
  switch(risk_level) {
    case 0: display.print("G"); break;  // Green
    case 1: display.print("Y"); break;  // Yellow
    case 2: display.print("R"); break;  // Red
  }
  
  // Line 2: Tilt + Temperature
  display.setCursor(0, 16);
  display.print("Tilt:");
  display.print(tilt_x, 1);
  display.print(" ");
  display.print((char)247);  // Degree symbol
  display.print(" ");
  
  display.print((int)temperature);
  display.print("C");
  
  // Line 3: Light + Motion
  display.setCursor(0, 32);
  display.print("L:");
  if(light_level < LIGHT_THRESHOLD) display.print("ON ");
  else display.print("OFF");
  
  display.print(" M:");
  display.print(motion_detected ? "Y" : "N");
  
  // Line 4: Rain + Distance
  display.setCursor(0, 48);
  display.print("Rain:");
  if(rain_value > RAIN_THRESHOLD) display.print("WET ");
  else display.print("DRY");
  
  display.print(" D:");
  display.print((int)distance_cm);
  display.print("cm");
  
  display.display();
}

// ============== SERIAL OUTPUT ==============

void printToSerial(int risk_level) {
  Serial.println("\n=== INFRA GUARD DATA ===");
  
  Serial.print("Risk Level: ");
  switch(risk_level) {
    case 0: Serial.println("SAFE"); break;
    case 1: Serial.println("WARNING"); break;
    case 2: Serial.println("CRITICAL"); break;
  }
  
  Serial.print("Tilt: "); Serial.print(tilt_x, 2); Serial.println(" deg");
  Serial.print("Temp: "); Serial.print(temperature, 1); Serial.println(" C");
  Serial.print("Humidity: "); Serial.print(humidity, 1); Serial.println(" %");
  Serial.print("Light: "); Serial.println(light_level);
  Serial.print("Light Status: "); Serial.println(digitalRead(RELAY1_PIN) ? "ON" : "OFF");
  Serial.print("Motion: "); Serial.println(motion_detected ? "YES" : "NO");
  Serial.print("Distance: "); Serial.print(distance_cm, 1); Serial.println(" cm");
  Serial.print("Rain Sensor: "); Serial.println(rain_value);
  
  Serial.println("=========================");
}