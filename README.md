# MedicApp - Pneumonia Detection Cloud System

Results-driven Mobile Health (mHealth) application designed to assist doctors in detecting pneumonia from chest X-rays using Deep Learning.

## Project Architecture
The system consists of three main components:
1.  **MedicApp** (Frontend): React Native mobile application for Android/iOS.
2.  **MedicAppBackend** (Backend): Node.js & Express API for user management and data routing.
3.  **pneumo** (AI Service): Python FastAPI service hosting ResNet50/DenseNet models.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Python](https://www.python.org/) (v3.8 or higher)
- [Expo Go](https://expo.dev/client) app installed on your smartphone.

---

## Installation

### 1. Backend Setup (MedicAppBackend)
```bash
cd MedicAppBackend
npm install
```

### 2. AI Service Setup (pneumo)
It is recommended to use a virtual environment.
```bash
cd pneumo
pip install -r requirements.txt
```
*(Ensure TensorFlow and FastAPI are installed or if something is missing from the api.py file install it using pip)*

### 3. Mobile App Setup (MedicApp)
```bash
cd MedicApp
npm install
```

---

## How to Run (Step-by-Step)

Follow these steps in **3 separate terminal windows**:

### Step 1: Start the AI Service
Run the Python API which hosts the models.
```bash
# Inside 'pneumo' folder
uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

### Step 2: Start the Backend Server
Run the Node.js API gateway.
```bash
# Inside 'MedicAppBackend' folder
npm run dev
```

### Step 3: Configure Network IP (Crucial!)
Before starting the app, you must tell the mobile app where your backend is running.
1.  Open a terminal and find your local IP address:
    *   **Windows**: `ipconfig` (Look for IPv4 Address, e.g., `192.168.1.6`)
    *   **Mac/Linux**: `ifconfig`
2.  Open the file `MedicApp/services/api.js`.
3.  Update the `API_URL` line:
    ```javascript
    export const API_URL = "http://YOUR_LOCAL_IP:5000";
    ```

### Step 4: Start the Mobile App 
Launch the Expo development server.
```bash
# Inside 'MedicApp' folder
npm expo start
# OR
npm start
```
*Scan the QR code with your phone (using Expo Go) or press 'a' to run on Android Emulator.*

---

