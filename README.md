Markdown
# 🐝 Desi Hive (DesiHive.in)

> **The Global Digital Village for People of Indian Origin**

[![HTML5](https://img.shields.io/badge/Frontend-HTML5%20%2F%20TailwindCSS-orange?style=flat-square)](https://developer.mozilla.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-green?style=flat-square)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-yellow?style=flat-square)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

---

## 🌟 About The Project

**Desi Hive** is a unified, hyper-local ecosystem built to connect the 30-million-strong global Indian diaspora. Spanning across safety, resource sharing, employment, and culture, the platform organizes users into structured **Global Hoods** across Country, State, and Neighborhood tiers to eliminate immigrant isolation.

---

## 🚀 Key Features & Modules

* **🌍 Global Hoods & Sub-Group Chats:** Structured National, State, and Neighborhood chat rooms equipped with dedicated sub-channels for regular chatter, events, SOS alerts, and community donations.
* **🤖 Dost AI Companion:** An integrated Gemini-powered AI assistant present across chat environments to provide guidance and platform support using friendly, localized context.
* **🚨 Global SOS & Free Mapping:** A 10-second countdown emergency system integrated with **Leaflet.js and OpenStreetMap** that broadcasts real-time crisis alerts and precise GPS map coordinates to nearby members.
* **🩸 Rakt Sewa (Blood Donor Network):** A peer-to-peer blood donation matching system equipped with automated Gmail dispatching via Nodemailer to alert compatible neighborhood donors instantly.
* **💼 Hiring Hive & Desi Bazaar:** A community job board supporting resume/CV uploads and application tracking, alongside a local peer-to-peer marketplace to buy, sell, and barter goods.
* **📰 Smart Dual News Engine:** Real-time dual news feeds powered by NewsData.io, displaying national headlines alongside localized home-state and regional updates.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Tailwind CSS, JavaScript (ES6+), FontAwesome
* **Mapping Engine:** Leaflet.js, OpenStreetMap API
* **Backend & Cloud Services:** Node.js, Express.js, Firebase Auth & Firestore (v12.16.0)
* **Email Automation:** Nodemailer, Gmail SMTP, EmailJS API
* **AI Integration:** Google Gemini API (`gemini-3.6-flash`)
* **News Intelligence:** NewsData.io API

---

## 📂 Project Structure

```text
Desi-hive/
├── index.html        # Single-Page Application (Frontend UI, Maps & Logic)
├── server.js         # Node.js & Express Backend (Nodemailer / Email Services)
├── package.json      # Node dependencies and configuration
└── README.md         # Project documentation
💻 Getting Started Locally
To run this project on your local machine, follow these steps:

1. Clone the Repository
Bash
git clone [https://github.com/suryaprakashkondapally-code/Desi-hive.git](https://github.com/suryaprakashkondapally-code/Desi-hive.git)
cd Desi-hive
2. Install Dependencies
Bash
npm install
3. Run the Backend Mail Server
Start the Express backend to handle secure OTP verification, welcome emails, and emergency SOS alerts:

Bash
node server.js
(The server runs locally on http://localhost:5000).

4. Launch the Frontend
Open index.html using a local development server (such as the Live Server extension in Visual Studio Code) to view and test the application interface.

🔒 Security & Optimizations
Authentication: Enforces strict password criteria (minimum 8 characters, at least 1 uppercase letter, and 1 number) paired with secure Gmail verification codes.

Billing-Free Mapping: Utilizes Leaflet and OpenStreetMap with customized control overrides (attributionControl: false) to ensure a clean, cost-free interactive mapping experience.

👨‍💻 Author
Surya Prakash Kondapally

Full-Stack Developer | Final-Year B.Tech Engineering Student

GitHub Profile
