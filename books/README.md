# KarobarPro

**Professional Business, Billing & Book-keeping Suite for Pakistan**

[![License](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Made in Pakistan](https://img.shields.io/badge/Made%20in-Pakistan%20🇵🇰-green.svg)](https://github.com/sabahatnoman84-afk/KarobarPro-app)

KarobarPro is a free, open-source accounting and business management application designed specifically for Pakistani small and medium businesses. It handles billing, inventory, GST compliance, Khata (credit ledger), Point of Sale, and full double-entry bookkeeping — all in one desktop app.

Built on top of the proven Frappe Books engine, KarobarPro adds Pakistan-specific features like CNIC tracking, WhatsApp payment reminders, FBR-compliant tax templates, and Urdu language support.

---

## 🎯 Pakistan-Specific Features

- 🇵🇰 **Urdu Language Support** — Full RTL interface with translation file
- 📇 **CNIC / NTN / STRN** — Track Pakistani ID and tax numbers on customers and suppliers
- 💬 **WhatsApp Payment Reminders** — Send one-click reminders from the Khata Book screen
- 📱 **JazzCash / EasyPaisa Payment QR** — Generate QR codes on invoices for local payments
- 🧾 **Pakistan Tax Templates** — Auto-creates GST-17, PRA-16, SRB-15, KPRA-15 on setup
- 📊 **Khata Book Screen** — Digital replacement for the traditional credit ledger
- 🗓️ **July–June Fiscal Year** — Pakistan's standard fiscal calendar
- 📍 **Pakistani Provinces** — Auto-populated state dropdown

---

## ✨ Core Features

- **Dashboard** — Real-time overview of cashflow, sales, purchases, and expenses
- **Point of Sale** — Fast retail terminal with barcode and thermal printer support
- **Invoicing** — Sales invoices, purchase invoices, quotes, and returns
- **Accounting** — Double-entry bookkeeping with ledger, P&L, Balance Sheet, Trial Balance
- **Inventory** — Batch tracking, serial numbers, UOM conversions, stock ledger
- **Payments** — Receive, pay, write-off, and partial payments
- **Multi-language** — 20+ languages including Urdu
- **Offline-first** — All data stored locally in SQLite, no internet required

---

## 💻 Tech Stack

- **Vue 3** — Frontend framework (Composition API + Options API)
- **TypeScript** — Type-safe code throughout
- **Electron 22** — Desktop wrapper for Windows, macOS, and Linux
- **SQLite** (via better-sqlite3) — Local database, no server required
- **Vite** — Fast build tool with hot reload
- **Tailwind CSS** — Utility-first styling with RTL support

---

## 🚀 Getting Started

### Download the Installer

Download the latest release from the [Releases page](https://github.com/sabahatnoman84-afk/KarobarPro-app/releases).

- **Windows 64-bit:** `KarobarPro-v1.0.0-windows-x64.exe`
- **Windows 32-bit:** `KarobarPro-v1.0.0-windows-ia32.exe`
- **Portable (no install):** `KarobarPro-v1.0.0-windows.exe`

### Development Setup

**Prerequisites:**
- **Node.js** >= 18.11.0 ([download](https://nodejs.org/))
- **Git** ([download](https://git-scm.com/))

```bash
# 1. Clone the repository
git clone https://github.com/sabahatnoman84-afk/KarobarPro-app.git

# 2. Navigate into the app folder
cd KarobarPro-app/books

# 3. Install dependencies
npm install

# 4. Start the app in development mode
npm run dev