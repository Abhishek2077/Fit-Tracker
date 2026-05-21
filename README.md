# FitTracker: 100% Offline Nutrition Tracker

> Your personal, fully offline, privacy-first nutrition and diet tracker. No cloud, no AI, no subscriptions.

![FitTracker](https://img.shields.io/badge/FitTracker-Nutrition-gold?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Ready-green?style=for-the-badge)
![Offline](https://img.shields.io/badge/100%25-Offline-blue?style=for-the-badge)

## Core Philosophy
FitTracker has been rebuilt from the ground up to serve one specific purpose: **Deterministic, high-precision nutrition tracking without any gimmicks.**

There is no AI hallucinating macros, no cloud servers analyzing your data, and no social features. Everything is stored directly on your device using IndexedDB, meaning your data remains 100% private and yours forever.

## Features

- 🍗 **Manual Macro Logging** — Track calories, protein, carbs, fats, and sodium with absolute precision.
- 🍔 **Cheat Meal Isolation** — Manually mark specific food items as a "Cheat Meal". These items are isolated and tracked separately in your monthly reports to keep you accountable without ruining your daily averages.
- 📊 **Deterministic Reports** — Pure mathematical aggregation. View comprehensive Daily and 30-Day Monthly summaries of your nutritional intake.
- 🏆 **Dynamic Goals & Streaks** — Set your custom target weight, protein goals, and calorie limits. Maintain protein streaks to stay motivated.
- 📄 **Premium PDF Export** — Generate highly professional, data-rich PDF reports of your 30-day nutrition log and cheat meal history for your dietician or personal records.
- 📲 **PWA Installation** — Install directly to your device's home screen. Acts exactly like a native app.
- 🔒 **Privacy-First** — Works completely offline. No internet connection required after initial load.

## Tech Stack

- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
- **Database:** IndexedDB (`idb` wrapper logic)
- **Charts:** Chart.js
- **PDF Generation:** jsPDF + autoTable

## Installation

Because FitTracker is a Progressive Web App (PWA), installation is simple:
1. Host the files on any static web server or open `index.html` via a local server (like Live Server).
2. Open the URL in your browser (Chrome/Safari/Edge).
3. Click the "Install" prompt or select "Add to Home Screen" from your browser's menu.

## Usage Guide
1. **Set your Profile**: Enter your current weight, target weight, calorie goal, and protein goal.
2. **Log Meals**: Go to the Log tab. Add food items one by one. Use the "Cheat 🔥" checkbox to mark specific junk food items.
3. **View Reports**: Go to the Reports tab to see your daily and monthly progress.
4. **Export**: Use the "Export PDF" button to download a professional summary of your last 30 days.

## Data Persistence
All data is stored in the browser's `IndexedDB`. If you clear your browser's site data or cache completely, your logs will be deleted. Always export your PDF reports if you wish to keep long-term external records.
