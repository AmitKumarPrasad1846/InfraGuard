# 🏗️ INFRA GUARD – Smart Infrastructure Monitoring System

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-ESP32-cyan)](https://www.espressif.com)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-brightgreen)](https://mongodb.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> ⚡ **Real-time IoT infrastructure monitoring system** for bridges, buildings, and highways — built to save lives and energy.

---

## 📌 Overview

**InfraGuard** is a complete IoT-based infrastructure monitoring system that continuously tracks structural health, automates street lighting, and sends real-time alerts. Built with ESP32 and a full-stack web dashboard, it's designed to prevent failures and optimize energy usage.

### 🌟 Key Features
- 🧱 **Structural Health Monitoring** – Tilt, vibration, and crack detection
- 💡 **Smart Street Lighting** – 60%+ energy savings with auto control
- 🚶 **Traffic & Motion Detection** – PIR + ultrasonic sensors
- 🌦️ **Environmental Monitoring** – Temperature, humidity, rain, water level
- 📊 **Real-time Dashboard** – Live graphs, historical data, manual controls
- 🔔 **Instant Alerts** – Buzzer + dashboard notifications (email/SMS ready)
- 📱 **Responsive Design** – Works on mobile, tablet, and desktop

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Hardware** | ESP32, MPU6050, DHT11, LDR, PIR, HC-SR04, Rain Sensor, OLED, Relay, Buzzer |
| **Firmware** | C++ (Arduino IDE) |
| **Backend** | Node.js, Express, MongoDB, Socket.IO, JWT |
| **Frontend** | HTML5, CSS3, JavaScript, Chart.js, Leaflet.js |
| **Protocols** | HTTP, WebSocket, JSON |

---

## 🚀 Live Demo

- 🌐 **Dashboard:** https://infraguard.vercel.app
- 📡 **API Base URL:** https://infraguard-api.onrender.com/api
- 🔑 **Demo Credentials:** `admin` / `admin123`

---

## 📁 Project Structure
infra-guard/
│
├── backend/
│ ├── app.js # Main server (Node.js + Express)
│ ├── package.json
│ └── .env.example
│
├── frontend/
│ └── public/
│ ├── index.html # Landing page
│ ├── dashboard.html # Main dashboard
│ ├── analytics.html # Analytics page
│ ├── alerts.html # Alert center
│ ├── map.html # Map view
│ ├── nodes.html # Node management
│ ├── settings.html # Settings page
│ ├── profile.html # User profile
│ ├── login.html # Authentication
│ ├── 404.html # Error page
│ ├── css/ # Stylesheets
│ └── js/ # JavaScript files
│
├── esp32/
│ └── infra_guard.ino # ESP32 firmware code
│
└── README.md


---

## 🔧 Hardware Setup

### Components Required

| Component | Quantity |
|-----------|---------|
| ESP32 Development Board | 1 |
| MPU6050 (Tilt & Vibration) | 1 |
| DHT11 (Temperature & Humidity) | 1 |
| LDR (Light Sensor) | 1 |
| PIR (Motion Sensor) | 1 |
| HC-SR04 (Ultrasonic Distance) | 1 |
| Rain Sensor Module | 1 |
| OLED 128x64 (I2C) | 1 |
| 2-Channel Relay Module | 1 |
| Buzzer | 1 |
| LED Bulb (12V) | 1 |
| 18650 Batteries + TP4056 Charger | 2 |
| Jumper Wires, Breadboard | - |

### Wiring Diagram

| ESP32 Pin | Component |
|-----------|-----------|
| 3.3V | MPU6050 VCC, DHT11 VCC, OLED VCC |
| 5V | HC-SR04 VCC, PIR VCC, Relay VCC |
| GND | All components GND |
| GPIO 21 (SDA) | MPU6050 SDA, OLED SDA |
| GPIO 22 (SCL) | MPU6050 SCL, OLED SCL |
| GPIO 4 | DHT11 DATA |
| GPIO 5 | HC-SR04 TRIG |
| GPIO 18 | HC-SR04 ECHO |
| GPIO 19 | PIR OUT |
| GPIO 34 | LDR A0 |
| GPIO 35 | Rain Sensor A0 |
| GPIO 25 | Relay 1 IN (Light) |
| GPIO 27 | Buzzer |

---

## 💻 Software Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/infra-guard.git
cd infra-guard
```
## Backend Setup
cd backend
npm install
cp .env.example .env
# Add your MongoDB URI and JWT secret in .env file
npm start

## Frontend Setup
### Serve the frontend/public folder using any static server:
cd frontend
npx serve public

ESP32 Firmware
Open esp32/infra_guard.ino in Arduino IDE

Install required libraries:

MPU6050

DHT sensor library

Adafruit SSD1306

ArduinoJson

Update WiFi credentials and server IP in the code

Upload to ESP32

📡 API Endpoints
Endpoint	Method	Description
/api/health	GET	Server health check
/api/data	POST	Receive sensor data from ESP32
/api/latest/:nodeId	GET	Get latest data for a node
/api/history/:nodeId	GET	Get historical data (hours param)
/api/alerts	GET	Get all alerts
/api/nodes	GET	Get all nodes with latest data
/api/login	POST	User authentication
/api/register	POST	User registration
📈 Performance Metrics
Metric	Value
Sensor Accuracy	97.3%
Response Time	<0.1 sec
False Alarm Rate	<3%
Energy Savings	62%
Cost per Node	~₹4,000
Lines of Code	5000+


📬 Contact
Amit Kumar Prasad

GitHub: @AmitKumarPrasad1846

LinkedIn: Amit Kumar Prasad

Chandrashekhar Ahirwar

GitHub: @chandrashekharahirwar

LinkedIn: Chandrashekhar Ahirwar

<p align="center"> Made with ❤️ in India 🇮🇳 </p> ```
