# 🐝 Desi Hive (DesiHive.in)

> **The Global Digital Village for People of Indian Origin**

---

## 📌 Project Overview

> **Desi Hive** is a unified, hyper-local digital ecosystem built to connect the 30-million-strong global Indian diaspora. It bridges cultural gaps, promotes community safety, facilitates localized micro-economies, and eradicates immigrant isolation by organizing users into structured **Global Hoods** (Country, State, and Neighborhood tiers).

---

## 🛠️ Core Technology Stack

* **Frontend UI/UX:** HTML5, Tailwind CSS, JavaScript (ES6+), FontAwesome
* **Mapping Engine:** Leaflet.js, OpenStreetMap API
* **Backend & Database:** Node.js, Express.js, Firebase Auth & Firestore (v12.16.0)
* **Email Automation:** Nodemailer, Gmail SMTP, EmailJS API
* **Artificial Intelligence:** Google Gemini API (`gemini-3.6-flash`)
* **News Intelligence:** NewsData.io API

---

## 📦 Core Feature Modules

### 1. 🌍 Global Hoods & Sub-Group Chats
* **Hierarchical Lounges:** Segregated chat spaces across National, State, and Local tiers.
* **Subgroup Channels:** Dedicated communication channels for regular chatter, community events, SOS emergency alerts, and financial donations.

### 2. 🤖 Dost AI Companion
* **Conversational AI:** Powered by the Google Gemini API to assist users seamlessly through platform navigation.
* **Cultural Context:** Integrated across chat environments using friendly, localized slang and guidance.

### 3. 🚨 Global SOS & Free Mapping
* **10-Second Triage:** Rapid emergency trigger featuring a visual countdown timer and web audio siren simulation.
* **OpenStreetMap Integration:** Powered by Leaflet.js with custom controls (`attributionControl: false`) for precise GPS coordinate broadcasting.

### 4. 🩸 Rakt Sewa (Blood Donor Network)
* **Peer-to-Peer Matching:** Connects blood donors with seekers based on age, blood group, and location data.
* **Automated Gmail Dispatch:** Instant red-accented email alerts dispatched securely via the Node.js backend.

### 5. 💼 Hiring Hive & Desi Bazaar
* **Employment Board:** Segmented career filters with drag-and-drop resume/CV upload support and application tracking.
* **Community Marketplace:** Local peer-to-peer bartering and marketplace listings for furniture, electronics, and home food.

---

## 🚀 Local Installation Guide

To run this project locally on your machine, execute the following steps in your terminal:

```bash
# 1. Clone the Repository
git clone [https://github.com/suryaprakashkondapally-code/Desi-hive.git](https://github.com/suryaprakashkondapally-code/Desi-hive.git)
cd Desi-hive

# 2. Install Dependencies
npm install

# 3. Start the Backend Mail Server
node server.js

# 4. Launch Frontend
# Open index.html using Live Server in VS Code
```

---

## 🔒 Security & Architecture

* **Strict Authentication:** Enforces secure password criteria (minimum 8 characters, 1 uppercase letter, 1 number) and 4-digit Gmail OTP verification.
* **Real-Time Sync:** Utilizes Firebase Firestore listeners (`onSnapshot`) for live data updates across clients without page reloads.

---

## 👨‍💻 Author & Developer

> **Surya Prakash Kondapally**<br>
> *Developer | Student | Learner*<br>
> [GitHub Profile](https://github.com/suryaprakashkondapally-code)<br>
> suryaprakashkondapally@gmail.com
---

<p align="center">
  © 2026 DesiHive.in. All rights reserved. Built for the community.
</p>
