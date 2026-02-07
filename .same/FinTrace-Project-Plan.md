# 💰 FinTrace - Complete Project Plan

> **App Name:** FinTrace
> **Domain:** fintrace.in
> **Tagline:** "Track Every Rupee, Grow Every Day"
> **Version:** 2.0
> **Last Updated:** February 6, 2026
> **Status:** Planning Phase - Ready for Development

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [New Features (v2.0)](#-new-features-v20)
3. [Tech Stack](#-tech-stack)
4. [System Architecture](#-system-architecture)
5. [Design System](#-design-system)
6. [Database Schema](#-database-schema)
7. [API Architecture](#-api-architecture)
8. [Screen Designs](#-screen-designs)
9. [Bank Integration Methods](#-bank-integration-methods)
10. [Development Phases](#-development-phases)
11. [Phase-wise Todo List](#-phase-wise-todo-list)
12. [Deployment Guide](#-deployment-guide)

---

## 🎯 Project Overview

### App Identity

| Attribute | Value |
|-----------|-------|
| **App Name** | FinTrace |
| **Domain** | fintrace.in |
| **Tagline** | "Track Every Rupee, Grow Every Day" |
| **Primary Platform** | iOS (PWA) |
| **Secondary Platforms** | Android (PWA), Web Dashboard |
| **Primary Currency** | ₹ INR |
| **Multi-Currency** | Yes (USD, EUR, GBP, AED, SGD, etc.) |
| **Language** | English (Hindi planned) |
| **Design Style** | iOS Native-like, Clean, Minimal |
| **Offline Support** | Full offline-first with sync |
| **Hosting** | Self-hosted on Ubuntu |
| **Multi-User** | Yes (Family accounts) |
| **Authentication** | Email/Password + Biometric + PIN |

### Core Value Propositions

1. **Unified Financial View** - All accounts, loans, investments in one place
2. **Smart Import** - Auto-fetch bank statements via Account Aggregator
3. **Intelligent Categorization** - AI-powered auto-categorization
4. **Loan Management** - Complete EMI tracking with calculators
5. **Family Finance** - Shared budgets, expense splitting, family dashboard
6. **AI Insights** - Personalized saving recommendations & spending analysis
7. **Investment Tracking** - Mutual funds, stocks, FDs, gold tracking
8. **Voice Entry** - Add expenses using voice commands
9. **Receipt OCR** - Scan receipts to auto-extract transaction details
10. **Privacy First** - Self-hosted, your data stays with you
11. **India-Tailored** - UPI, IFSC, GST, 80C tracking, Indian banks

---

## 🆕 New Features (v2.0)

### 1. Multi-User & Family Tracking

```
┌─────────────────────────────────────────────────────────┐
│                    FAMILY STRUCTURE                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────┐                                       │
│   │   Family    │ (Shared entity)                       │
│   │  "Sharma's" │                                       │
│   └──────┬──────┘                                       │
│          │                                              │
│   ┌──────┴──────────────────────────┐                   │
│   │              │                  │                   │
│   ▼              ▼                  ▼                   │
│ ┌─────┐      ┌─────┐           ┌─────┐                 │
│ │Admin│      │Member│          │Member│                │
│ │(Dad)│      │(Mom) │          │(Son) │                │
│ └─────┘      └─────┘           └─────┘                 │
│                                                         │
│ Features:                                               │
│ ├── Shared family budgets                               │
│ ├── Individual + Family accounts                        │
│ ├── Expense splitting                                   │
│ ├── Family dashboard                                    │
│ ├── Role-based permissions                              │
│ ├── Activity feed                                       │
│ └── Family goals                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- **Family Creation** - Create family group, invite members
- **Role-Based Access** - Admin, Member, View-Only roles
- **Shared Accounts** - Joint accounts visible to all
- **Personal Accounts** - Private accounts only you can see
- **Family Budget** - Combined household budget tracking
- **Expense Splitting** - Split bills among family members
- **Family Dashboard** - See combined family finances
- **Activity Feed** - Who added what, recent changes
- **Family Goals** - Save together for family vacation, etc.
- **Allowance Tracking** - Track kids' pocket money

### 2. Self-Hosted Ubuntu Deployment

```
┌─────────────────────────────────────────────────────────┐
│                 SELF-HOSTED ARCHITECTURE                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Ubuntu Server (20.04/22.04 LTS)                       │
│   ┌─────────────────────────────────────────────────┐   │
│   │                                                 │   │
│   │  ┌─────────────┐  ┌─────────────┐              │   │
│   │  │   Nginx     │  │  Certbot    │              │   │
│   │  │  (Reverse   │  │  (SSL/TLS)  │              │   │
│   │  │   Proxy)    │  │             │              │   │
│   │  └──────┬──────┘  └─────────────┘              │   │
│   │         │                                       │   │
│   │  ┌──────┴──────────────────────────────┐       │   │
│   │  │           Docker Compose            │       │   │
│   │  │  ┌─────────┐ ┌─────────┐ ┌───────┐ │       │   │
│   │  │  │Frontend │ │ Backend │ │ Redis │ │       │   │
│   │  │  │  (PWA)  │ │(Fastify)│ │       │ │       │   │
│   │  │  └─────────┘ └────┬────┘ └───────┘ │       │   │
│   │  │                   │                 │       │   │
│   │  │            ┌──────┴──────┐          │       │   │
│   │  │            │ PostgreSQL  │          │       │   │
│   │  │            │   + MinIO   │          │       │   │
│   │  │            └─────────────┘          │       │   │
│   │  └─────────────────────────────────────┘       │   │
│   │                                                 │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   Requirements:                                         │
│   ├── Ubuntu 20.04/22.04 LTS                            │
│   ├── 2GB+ RAM (4GB recommended)                        │
│   ├── 20GB+ Storage                                     │
│   ├── Docker & Docker Compose                           │
│   └── Domain with SSL (Let's Encrypt)                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Deployment Features:**
- **One-Command Install** - `curl -sSL https://fintrace.in/install.sh | bash`
- **Docker Compose** - All services containerized
- **Automatic Backups** - Daily PostgreSQL backups
- **SSL/TLS** - Free Let's Encrypt certificates
- **Reverse Proxy** - Nginx for performance
- **Update Script** - Easy version updates
- **Health Monitoring** - Built-in health checks

### 3. Biometric Authentication

```
Authentication Flow:
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   App Launch                                            │
│       │                                                 │
│       ▼                                                 │
│   ┌─────────────────┐                                   │
│   │ Biometric Check │◄──── Face ID / Touch ID /        │
│   │    Enabled?     │      Fingerprint                  │
│   └────────┬────────┘                                   │
│            │                                            │
│     ┌──────┴──────┐                                     │
│     │ Yes         │ No                                  │
│     ▼             ▼                                     │
│ ┌───────────┐  ┌───────────┐                           │
│ │ Show      │  │ Show PIN  │                           │
│ │ Biometric │  │  Entry    │                           │
│ │  Prompt   │  │  Screen   │                           │
│ └─────┬─────┘  └─────┬─────┘                           │
│       │              │                                  │
│       └──────┬───────┘                                  │
│              ▼                                          │
│       ┌─────────────┐                                   │
│       │  Verified?  │                                   │
│       └──────┬──────┘                                   │
│              │                                          │
│       ┌──────┴──────┐                                   │
│       │ Yes         │ No                                │
│       ▼             ▼                                   │
│   ┌───────┐    ┌──────────┐                            │
│   │ Enter │    │ 3 Failed │──► Lock Account            │
│   │  App  │    │ Attempts │    (30 min cooldown)       │
│   └───────┘    └──────────┘                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- **Face ID** (iOS) - Native Face ID support
- **Touch ID** (iOS) - Fingerprint authentication
- **Fingerprint** (Android) - Android biometric API
- **PIN Fallback** - 4-6 digit PIN as backup
- **Auto-Lock** - Lock after X minutes of inactivity
- **Secure Enclave** - Keys stored in device secure storage
- **Quick Unlock** - For returning within 1 minute

### 4. AI Insights & Recommendations

```
┌─────────────────────────────────────────────────────────┐
│                    AI INSIGHTS ENGINE                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Data Sources                    AI Processing         │
│   ┌─────────────┐                                       │
│   │Transactions │──┐                                    │
│   └─────────────┘  │         ┌─────────────────┐        │
│   ┌─────────────┐  │         │                 │        │
│   │  Budgets    │──┼────────►│  ML Models      │        │
│   └─────────────┘  │         │  (On-device /   │        │
│   ┌─────────────┐  │         │   Server)       │        │
│   │   Goals     │──┤         │                 │        │
│   └─────────────┘  │         └────────┬────────┘        │
│   ┌─────────────┐  │                  │                 │
│   │   Loans     │──┘                  ▼                 │
│   └─────────────┘           ┌─────────────────┐         │
│                             │    Insights     │         │
│                             └────────┬────────┘         │
│                                      │                  │
│   ┌──────────────────────────────────┼─────────────┐    │
│   │                                  │             │    │
│   ▼                  ▼               ▼             ▼    │
│ ┌─────┐         ┌────────┐    ┌──────────┐  ┌────────┐ │
│ │Spend│         │Savings │    │Anomaly   │  │Forecast│ │
│ │Alerts│        │Tips    │    │Detection │  │        │ │
│ └─────┘         └────────┘    └──────────┘  └────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**AI Features:**
- **Spending Patterns** - "You spend 40% more on weekends"
- **Savings Opportunities** - "Switch to annual Spotify, save ₹600"
- **Bill Predictions** - "Your electricity bill is usually ₹2,500"
- **Anomaly Detection** - "Unusual ₹15,000 spend at electronics"
- **Budget Recommendations** - "Based on income, allocate ₹8,000 for food"
- **Goal Achievability** - "At current rate, you'll reach goal in 8 months"
- **Loan Insights** - "Prepay ₹50,000 to save ₹32,000 interest"
- **Category Trends** - "Food spending up 25% vs last month"
- **Merchant Analysis** - "You visit Swiggy 12 times/month"
- **Cash Flow Forecast** - "You might be short ₹5,000 by month end"

**Implementation:**
- TensorFlow.js for on-device ML
- OpenAI/Gemini API for advanced insights (optional)
- Rule-based engine for basic patterns
- Privacy-first: All processing can be local

### 5. Investment Tracking

```
┌─────────────────────────────────────────────────────────┐
│                  INVESTMENT PORTFOLIO                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Total Invested: ₹12,50,000                           │
│   Current Value:  ₹14,32,500  (+₹1,82,500 / +14.6%)    │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │              PORTFOLIO BREAKDOWN                 │   │
│   │                                                  │   │
│   │   Mutual Funds  ████████████████  52%           │   │
│   │   Stocks        ████████         28%            │   │
│   │   Fixed Deposit ████             12%            │   │
│   │   Gold          ██               6%             │   │
│   │   PPF           █                2%             │   │
│   │                                                  │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   HOLDINGS                                              │
│   ┌─────────────────────────────────────────────────┐   │
│   │ 📈 Mutual Funds                      ₹6,50,000  │   │
│   │    ├── Axis Bluechip Fund            ₹2,50,000  │   │
│   │    ├── Parag Parikh Flexi Cap        ₹2,00,000  │   │
│   │    ├── HDFC Index Nifty 50           ₹1,50,000  │   │
│   │    └── Mirae Asset Large Cap         ₹50,000    │   │
│   │                                                  │   │
│   │ 📊 Stocks                            ₹3,50,000  │   │
│   │    ├── Reliance Industries (50 qty)  ₹1,20,000  │   │
│   │    ├── HDFC Bank (30 qty)            ₹48,000    │   │
│   │    ├── Infosys (25 qty)              ₹45,000    │   │
│   │    └── + 5 more stocks               ₹1,37,000  │   │
│   │                                                  │   │
│   │ 🏦 Fixed Deposits                    ₹1,50,000  │   │
│   │    ├── SBI FD (7.1%, Mar 2025)       ₹1,00,000  │   │
│   │    └── HDFC FD (7.25%, Jun 2025)     ₹50,000    │   │
│   │                                                  │   │
│   │ 🥇 Gold                              ₹75,000    │   │
│   │    └── Sovereign Gold Bond           ₹75,000    │   │
│   │                                                  │   │
│   │ 🏛️ PPF                               ₹25,000    │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Supported Investments:**
| Type | Features |
|------|----------|
| **Mutual Funds** | NAV tracking, SIP tracking, XIRR returns, fund comparison |
| **Stocks** | Live prices, P&L, dividend tracking, portfolio analysis |
| **Fixed Deposits** | Maturity tracking, interest calculation, renewal alerts |
| **PPF/EPF** | Yearly contribution tracking, maturity projection |
| **NPS** | Tier 1 & 2 tracking, tax benefits |
| **Gold** | SGB, Digital Gold, Physical gold valuation |
| **Real Estate** | Property valuation, rental income |
| **Crypto** | Bitcoin, Ethereum (optional, user preference) |

**Data Sources:**
- **MF API** - mfapi.in (free mutual fund NAV)
- **Stock API** - NSE/BSE data via Yahoo Finance
- **Gold Prices** - Live gold rate API
- **Manual Entry** - For FDs, PPF, property

### 6. Voice Entry

```
┌─────────────────────────────────────────────────────────┐
│                    VOICE ENTRY FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   User speaks:                                          │
│   🎤 "Add 500 rupees for lunch at Swiggy"              │
│                                                         │
│           │                                             │
│           ▼                                             │
│   ┌───────────────────┐                                 │
│   │ Speech-to-Text    │ (Web Speech API /               │
│   │                   │  Whisper API)                   │
│   └─────────┬─────────┘                                 │
│             │                                           │
│             ▼                                           │
│   ┌───────────────────┐                                 │
│   │ NLP Processing    │ Extract:                        │
│   │                   │ - Amount: ₹500                  │
│   │                   │ - Category: Food & Dining       │
│   │                   │ - Merchant: Swiggy              │
│   │                   │ - Type: Expense                 │
│   └─────────┬─────────┘                                 │
│             │                                           │
│             ▼                                           │
│   ┌───────────────────┐                                 │
│   │ Confirmation      │ "Add ₹500 expense for          │
│   │ (Visual + Audio)  │  Food at Swiggy?"              │
│   └─────────┬─────────┘                                 │
│             │                                           │
│      ┌──────┴──────┐                                    │
│      │             │                                    │
│   ┌──▼──┐      ┌───▼───┐                               │
│   │ Yes │      │  No   │                               │
│   │ ✓   │      │ Edit  │                               │
│   └──┬──┘      └───────┘                               │
│      │                                                  │
│      ▼                                                  │
│   ┌───────────────────┐                                 │
│   │ Transaction Saved │ ✅                              │
│   └───────────────────┘                                 │
│                                                         │
│   SUPPORTED COMMANDS:                                   │
│   ├── "Add 500 for groceries"                           │
│   ├── "Spent 2000 on shopping at Amazon"                │
│   ├── "Received 50000 salary"                           │
│   ├── "Transfer 5000 to savings"                        │
│   ├── "How much did I spend today?"                     │
│   ├── "What's my balance?"                              │
│   └── "Show my expenses this week"                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Voice Features:**
- **Add Expense** - "Add 200 for coffee"
- **Add Income** - "Received 5000 freelance payment"
- **Transfer** - "Transfer 10000 from HDFC to SBI"
- **Query Balance** - "What's my HDFC balance?"
- **Query Spending** - "How much on food this month?"
- **Quick Commands** - Works even offline (queued)
- **Multi-language** - English + Hindi support

**Implementation:**
- Web Speech API (browser native)
- Whisper API (for accuracy, optional)
- Custom NLP for Indian context (lakh, crore, rupees)

### 7. Receipt OCR

```
┌─────────────────────────────────────────────────────────┐
│                    RECEIPT OCR FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────┐                                   │
│   │  📷 Capture     │  Camera / Gallery                 │
│   │    Receipt      │                                   │
│   └────────┬────────┘                                   │
│            │                                            │
│            ▼                                            │
│   ┌─────────────────┐                                   │
│   │ Image Processing│  - Crop & Rotate                  │
│   │                 │  - Enhance contrast               │
│   │                 │  - Noise reduction                │
│   └────────┬────────┘                                   │
│            │                                            │
│            ▼                                            │
│   ┌─────────────────┐                                   │
│   │   OCR Engine    │  Tesseract.js / Google Vision    │
│   │                 │  / AWS Textract                   │
│   └────────┬────────┘                                   │
│            │                                            │
│            ▼                                            │
│   ┌─────────────────┐                                   │
│   │  Data Extraction│  Extract:                         │
│   │                 │  - Merchant name                  │
│   │                 │  - Date & Time                    │
│   │                 │  - Total amount                   │
│   │                 │  - Items (optional)               │
│   │                 │  - GST number                     │
│   │                 │  - Payment method                 │
│   └────────┬────────┘                                   │
│            │                                            │
│            ▼                                            │
│   ┌─────────────────┐                                   │
│   │  Auto-Fill Form │  Pre-fill transaction            │
│   │                 │  with extracted data              │
│   └────────┬────────┘                                   │
│            │                                            │
│            ▼                                            │
│   ┌─────────────────┐                                   │
│   │ User Confirms   │  Review & edit if needed         │
│   │   & Saves       │                                   │
│   └─────────────────┘                                   │
│                                                         │
│   EXTRACTED DATA EXAMPLE:                               │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Merchant: Big Bazaar                            │   │
│   │ Date: 06-02-2026                                │   │
│   │ Amount: ₹2,547.00                               │   │
│   │ GST: 27AABCU9603R1ZM                            │   │
│   │ Category: 🛒 Shopping (auto-detected)           │   │
│   │ Items: 12 items                                 │   │
│   │ Payment: UPI                                    │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**OCR Features:**
- **Auto-Capture** - Detects receipt edges automatically
- **Multi-Receipt** - Scan multiple receipts in batch
- **Merchant Detection** - Recognizes common Indian merchants
- **GST Extraction** - Pulls GSTIN for tax records
- **Item Parsing** - Optional line-item extraction
- **Receipt Storage** - Attach to transaction for reference
- **Search Receipts** - OCR text is searchable

**Supported Receipt Types:**
- Retail store bills
- Restaurant bills
- Fuel station receipts
- E-commerce invoices (screenshot)
- Utility bills
- Medical bills

### 8. India-Tailored Features

```
┌─────────────────────────────────────────────────────────┐
│                  INDIA-SPECIFIC FEATURES                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🏦 BANKING                                              │
│ ├── UPI Transaction Tracking                            │
│ │   ├── Google Pay                                      │
│ │   ├── PhonePe                                         │
│ │   ├── Paytm                                           │
│ │   ├── BHIM                                            │
│ │   └── Bank UPI apps                                   │
│ ├── IFSC Code Lookup                                    │
│ ├── All major Indian banks supported                    │
│ ├── Account Aggregator (Setu, Finvu)                   │
│ └── NEFT/RTGS/IMPS categorization                       │
│                                                         │
│ 💰 CURRENCY & FORMAT                                    │
│ ├── ₹ Indian Rupee as default                           │
│ ├── Lakh/Crore formatting (₹1,00,000)                   │
│ ├── Indian number system                                │
│ └── DD-MM-YYYY date format                              │
│                                                         │
│ 📊 TAX & COMPLIANCE                                     │
│ ├── 80C Investment Tracking                             │
│ │   ├── PPF contributions                               │
│ │   ├── ELSS investments                                │
│ │   ├── Life insurance premiums                         │
│ │   ├── Home loan principal                             │
│ │   └── Children's tuition fees                         │
│ ├── 80D Health Insurance Tracking                       │
│ ├── HRA Calculation Helper                              │
│ ├── GST Input Credit Tracking (Business)                │
│ ├── TDS Tracking                                        │
│ └── Tax-Saving Report Generator                         │
│                                                         │
│ 🏠 LOANS (India-Specific)                               │
│ ├── Home Loan (with 80C, 24b tracking)                  │
│ ├── Vehicle Loan (Car, Two-wheeler)                     │
│ ├── Personal Loan                                       │
│ ├── Education Loan (80E benefit)                        │
│ ├── Gold Loan                                           │
│ ├── LAP (Loan Against Property)                         │
│ └── Credit Card EMI                                     │
│                                                         │
│ 📱 INTEGRATIONS                                         │
│ ├── SMS Transaction Parser                              │
│ │   ├── All major Indian banks                          │
│ │   ├── UPI transaction SMS                             │
│ │   └── Credit card alerts                              │
│ ├── Email Statement Parser                              │
│ │   ├── Bank statement emails                           │
│ │   └── Credit card statements                          │
│ └── PDF Statement Parser                                │
│     ├── HDFC, ICICI, SBI, Axis                          │
│     ├── Kotak, Yes Bank, IDFC                           │
│     └── All major banks                                 │
│                                                         │
│ 🎯 INDIAN EXPENSE CATEGORIES                            │
│ ├── Groceries (Kirana, BigBasket, Zepto)                │
│ ├── Domestic Help (Maid, Cook, Driver)                  │
│ ├── Society Maintenance                                 │
│ ├── Children's Education                                │
│ ├── Festival Expenses (Diwali, Holi, etc.)              │
│ ├── Gold/Jewelry Purchases                              │
│ ├── Religious/Puja Expenses                             │
│ └── Medical (with 80D tagging)                          │
│                                                         │
│ 📈 INDIAN INVESTMENTS                                   │
│ ├── Mutual Funds (with folio tracking)                  │
│ ├── Stocks (NSE/BSE)                                    │
│ ├── PPF                                                 │
│ ├── EPF/VPF                                             │
│ ├── NPS                                                 │
│ ├── Sukanya Samriddhi                                   │
│ ├── Sovereign Gold Bonds                                │
│ ├── Fixed Deposits                                      │
│ ├── Recurring Deposits                                  │
│ └── Post Office Schemes                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack (Updated)

### Frontend (PWA)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Base Components (customized) |
| Framer Motion | 11.x | Animations & Gestures |
| Dexie.js | 4.x | IndexedDB (Offline) |
| Recharts | 2.x | Charts & Graphs |
| Workbox | 7.x | Service Worker & PWA |
| React Router | 6.x | Navigation |
| Zustand | 4.x | State Management |
| React Hook Form | 7.x | Form Handling |
| Zod | 3.x | Schema Validation |
| date-fns | 3.x | Date Utilities |
| TanStack Query | 5.x | Server State & Caching |
| **Tesseract.js** | 5.x | **Receipt OCR** |
| **TensorFlow.js** | 4.x | **On-device AI** |
| **Web Speech API** | Native | **Voice Entry** |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime |
| Fastify | 4.x | API Framework |
| PostgreSQL | 16.x | Primary Database |
| Prisma | 5.x | ORM |
| Redis | 7.x | Caching & Sessions |
| BullMQ | 5.x | Job Queue |
| JWT | - | Access Tokens |
| Argon2 | - | Password Hashing |
| Zod | 3.x | API Validation |
| Pino | - | Logging |
| **MinIO** | Latest | **File Storage (Self-hosted S3)** |
| **Whisper** | - | **Voice Processing (Optional)** |
| **Sharp** | 0.33.x | **Image Processing** |

### External Integrations

| Service | Purpose | Priority |
|---------|---------|----------|
| Setu AA API | Account Aggregator | Phase 7 |
| Finvu API | Account Aggregator (backup) | Phase 7 |
| **mfapi.in** | **Mutual Fund NAV** | Phase 6 |
| **Google Vision API** | **OCR (Optional, better accuracy)** | Phase 6 |
| **OpenAI/Gemini API** | **AI Insights (Optional)** | Phase 8 |
| Firebase FCM | Push Notifications | Phase 8 |
| SendGrid / Resend | Email Notifications | Phase 8 |

### Self-Hosted Stack

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Service Orchestration |
| Nginx | Reverse Proxy |
| Certbot | SSL/TLS Certificates |
| MinIO | S3-compatible File Storage |
| PostgreSQL | Database |
| Redis | Cache & Sessions |
| Watchtower | Auto-updates (Optional) |

---

## 🏗️ System Architecture

### Self-Hosted Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     UBUNTU SERVER                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      NGINX                                  │ │
│  │              (Reverse Proxy + SSL)                          │ │
│  │                   Port 80/443                               │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │                                       │
│  ┌──────────────────────┴─────────────────────────────────────┐ │
│  │                   DOCKER NETWORK                            │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │                                                      │   │ │
│  │  │  ┌──────────────┐      ┌──────────────┐             │   │ │
│  │  │  │   FRONTEND   │      │   BACKEND    │             │   │ │
│  │  │  │    (React)   │◄────►│  (Fastify)   │             │   │ │
│  │  │  │   Port 3000  │      │  Port 4000   │             │   │ │
│  │  │  └──────────────┘      └──────┬───────┘             │   │ │
│  │  │                               │                      │   │ │
│  │  │         ┌─────────────────────┼─────────────────┐   │   │ │
│  │  │         │                     │                 │   │   │ │
│  │  │         ▼                     ▼                 ▼   │   │ │
│  │  │  ┌────────────┐      ┌──────────────┐   ┌─────────┐│   │ │
│  │  │  │ PostgreSQL │      │    Redis     │   │  MinIO  ││   │ │
│  │  │  │  Port 5432 │      │  Port 6379   │   │Port 9000││   │ │
│  │  │  └────────────┘      └──────────────┘   └─────────┘│   │ │
│  │  │                                                      │   │ │
│  │  └──────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    VOLUMES (Persistent)                      │ │
│  │  ├── /data/postgres     (Database files)                    │ │
│  │  ├── /data/redis        (Cache data)                        │ │
│  │  ├── /data/minio        (File uploads)                      │ │
│  │  └── /data/backups      (Daily backups)                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│   │  iOS    │    │ Android │    │   Web   │    │ Desktop │    │
│   │  (PWA)  │    │  (PWA)  │    │ Browser │    │  (PWA)  │    │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema (Updated)

### New Tables for v2.0 Features

```sql
-- =============================================
-- FAMILY & MULTI-USER
-- =============================================

CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    invite_code VARCHAR(20) UNIQUE,

    settings JSONB DEFAULT '{
        "currency": "INR",
        "shared_budget_enabled": true,
        "activity_feed_enabled": true
    }',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role VARCHAR(20) DEFAULT 'member',  -- admin, member, viewer
    nickname VARCHAR(50),

    -- Permissions
    can_view_others_transactions BOOLEAN DEFAULT FALSE,
    can_edit_shared_budgets BOOLEAN DEFAULT TRUE,
    can_invite_members BOOLEAN DEFAULT FALSE,

    joined_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(family_id, user_id)
);

CREATE TABLE family_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),

    action VARCHAR(50) NOT NULL,  -- transaction_added, budget_updated, goal_contributed
    entity_type VARCHAR(50),
    entity_id UUID,

    description TEXT,
    metadata JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Mark accounts as personal or shared with family
ALTER TABLE accounts ADD COLUMN is_family_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN family_id UUID REFERENCES families(id);

-- Mark budgets as family budgets
ALTER TABLE budgets ADD COLUMN is_family_budget BOOLEAN DEFAULT FALSE;
ALTER TABLE budgets ADD COLUMN family_id UUID REFERENCES families(id);

-- Mark goals as family goals
ALTER TABLE goals ADD COLUMN is_family_goal BOOLEAN DEFAULT FALSE;
ALTER TABLE goals ADD COLUMN family_id UUID REFERENCES families(id);

-- =============================================
-- INVESTMENTS
-- =============================================

CREATE TYPE investment_type AS ENUM (
    'mutual_fund',
    'stock',
    'fixed_deposit',
    'recurring_deposit',
    'ppf',
    'epf',
    'nps',
    'gold',
    'real_estate',
    'crypto',
    'other'
);

CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    type investment_type NOT NULL,

    -- Identifiers
    symbol VARCHAR(50),           -- Stock symbol, MF scheme code
    isin VARCHAR(20),             -- ISIN for stocks/MF
    folio_number VARCHAR(50),     -- For mutual funds

    -- Holdings
    quantity DECIMAL(15, 4),      -- Units/Shares
    avg_buy_price DECIMAL(15, 4),
    current_price DECIMAL(15, 4),

    invested_amount DECIMAL(15, 2) NOT NULL,
    current_value DECIMAL(15, 2),

    -- For FD/RD
    interest_rate DECIMAL(5, 2),
    maturity_date DATE,
    maturity_amount DECIMAL(15, 2),

    -- Metadata
    broker VARCHAR(100),          -- Zerodha, Groww, etc.
    account_number VARCHAR(50),

    is_tax_saving BOOLEAN DEFAULT FALSE,  -- For 80C
    tax_section VARCHAR(10),              -- 80C, 80D, 80E

    last_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,

    type VARCHAR(20) NOT NULL,    -- buy, sell, dividend, sip
    date DATE NOT NULL,

    quantity DECIMAL(15, 4),
    price DECIMAL(15, 4),
    amount DECIMAL(15, 2) NOT NULL,

    fees DECIMAL(15, 2) DEFAULT 0,
    taxes DECIMAL(15, 2) DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_investments_user ON investments(user_id);
CREATE INDEX idx_investment_transactions_investment ON investment_transactions(investment_id);

-- =============================================
-- AI INSIGHTS
-- =============================================

CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,    -- spending_pattern, savings_tip, anomaly, forecast
    category VARCHAR(50),

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    priority VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, urgent

    -- For actionable insights
    action_type VARCHAR(50),      -- view_transactions, set_budget, prepay_loan
    action_data JSONB,

    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_acted_upon BOOLEAN DEFAULT FALSE,

    valid_until TIMESTAMP,        -- Insight expiry

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insights_user ON insights(user_id);
CREATE INDEX idx_insights_unread ON insights(user_id, is_read) WHERE is_read = FALSE;

-- =============================================
-- VOICE & OCR
-- =============================================

CREATE TABLE voice_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    audio_url TEXT,
    transcript TEXT,

    parsed_data JSONB,            -- Extracted amount, category, etc.
    confidence_score DECIMAL(3, 2),

    transaction_id UUID REFERENCES transactions(id),

    status VARCHAR(20) DEFAULT 'pending',  -- pending, processed, failed
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE receipt_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    image_url TEXT NOT NULL,

    -- OCR Results
    raw_text TEXT,

    extracted_data JSONB,         -- merchant, amount, date, items, gst
    confidence_score DECIMAL(3, 2),

    transaction_id UUID REFERENCES transactions(id),

    status VARCHAR(20) DEFAULT 'pending',  -- pending, processed, failed
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_voice_entries_user ON voice_entries(user_id);
CREATE INDEX idx_receipt_scans_user ON receipt_scans(user_id);

-- =============================================
-- BIOMETRIC & SECURITY
-- =============================================

ALTER TABLE users ADD COLUMN biometric_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN biometric_public_key TEXT;
ALTER TABLE users ADD COLUMN auto_lock_minutes INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN last_activity_at TIMESTAMP;

CREATE TABLE device_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(50),      -- ios, android, web

    biometric_key_id VARCHAR(255),
    push_token TEXT,

    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, device_id)
);

CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),

    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,

    success BOOLEAN,
    failure_reason VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_registrations_user ON device_registrations(user_id);
CREATE INDEX idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
```

---

## 🔌 API Architecture (Updated)

### New API Endpoints for v2.0

```
# FAMILY ENDPOINTS
GET    /family                     - Get user's family
POST   /family                     - Create family
PUT    /family                     - Update family settings
DELETE /family                     - Delete family (admin only)
POST   /family/invite              - Generate invite link
POST   /family/join                - Join family with invite code
GET    /family/members             - List family members
PUT    /family/members/:id         - Update member role/permissions
DELETE /family/members/:id         - Remove member
GET    /family/activity            - Get family activity feed
GET    /family/dashboard           - Get family financial summary

# INVESTMENT ENDPOINTS
GET    /investments                - List all investments
POST   /investments                - Add investment
GET    /investments/:id            - Get investment details
PUT    /investments/:id            - Update investment
DELETE /investments/:id            - Delete investment
POST   /investments/:id/transaction - Add buy/sell/dividend
GET    /investments/:id/transactions - Get investment transactions
GET    /investments/summary        - Get portfolio summary
GET    /investments/sync           - Sync prices from APIs
GET    /investments/tax-report     - Get tax-saving report (80C, 80D)

# AI INSIGHTS ENDPOINTS
GET    /insights                   - Get all insights
GET    /insights/dashboard         - Get top insights for dashboard
POST   /insights/:id/read          - Mark as read
POST   /insights/:id/dismiss       - Dismiss insight
POST   /insights/:id/action        - Take action on insight
POST   /insights/generate          - Trigger insight generation

# VOICE ENTRY ENDPOINTS
POST   /voice/transcribe           - Upload audio for transcription
POST   /voice/process              - Process transcribed text
GET    /voice/history              - Get voice entry history

# RECEIPT OCR ENDPOINTS
POST   /receipts/scan              - Upload receipt image
GET    /receipts/:id               - Get scan result
POST   /receipts/:id/confirm       - Confirm and create transaction
GET    /receipts/history           - Get scan history

# BIOMETRIC ENDPOINTS
POST   /auth/biometric/register    - Register biometric credential
POST   /auth/biometric/verify      - Verify biometric login
DELETE /auth/biometric             - Remove biometric
GET    /auth/devices               - List registered devices
DELETE /auth/devices/:id           - Remove device

# INDIA-SPECIFIC ENDPOINTS
GET    /ifsc/:code                 - Lookup IFSC code
GET    /tax/80c-summary            - Get 80C deduction summary
GET    /tax/report/:year           - Get tax summary report
GET    /upi/parse                  - Parse UPI transaction string
```

---

## 📱 Screen Designs (Updated)

### Updated Navigation Structure

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    SCREEN CONTENT                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   🏠        📊        ➕        💹        ≡            │
│  Home     Stats      Add     Invest     More           │
│                                                         │
└─────────────────────────────────────────────────────────┘

Changes from v1:
- "Loans" tab → Moved to More menu
- New "Invest" tab → Investment portfolio
```

### New Screens for v2.0

| Section | Screen | Description |
|---------|--------|-------------|
| **Home** | AI Insights Card | Smart insights on dashboard |
| **Home** | Family Activity | Recent family transactions |
| **Add** | Voice Entry | Voice input for transactions |
| **Add** | Scan Receipt | Camera for OCR |
| **Invest** | Portfolio Dashboard | Investment overview |
| **Invest** | Holdings List | All investments |
| **Invest** | Add Investment | Add MF/Stock/FD |
| **Invest** | Investment Detail | Single investment view |
| **Invest** | Tax Savings | 80C/80D tracker |
| **More** | Family | Family management |
| **More** | Family Dashboard | Combined family view |
| **More** | Family Members | Manage members |
| **More** | AI Insights | All insights list |
| **More** | Security | Biometric & PIN settings |
| **Auth** | Biometric Login | Face ID / Fingerprint screen |
| **Auth** | PIN Entry | 4-6 digit PIN screen |

---

## 🚀 Development Phases (Updated)

### Updated Phase Overview

| Phase | Name | Duration | Priority | New in v2 |
|-------|------|----------|----------|-----------|
| 1 | Foundation & Core | 2-3 days | Critical | |
| 2 | Accounts & Transactions | 2-3 days | Critical | |
| 3 | Dashboard & UI Polish | 1-2 days | Critical | ✅ AI Insights UI |
| 4 | Budgets & Goals | 1-2 days | High | |
| 5 | Loans & EMI | 2 days | High | |
| 6 | **Investments & Tax** | **2-3 days** | **High** | ✅ **NEW** |
| 7 | Reports & Analytics | 1-2 days | High | |
| 8 | Bank Integration | 2-3 days | Medium | |
| 9 | **Multi-User & Family** | **2-3 days** | **High** | ✅ **NEW** |
| 10 | **Voice & OCR** | **2-3 days** | **Medium** | ✅ **NEW** |
| 11 | **AI Insights Engine** | **2-3 days** | **Medium** | ✅ **NEW** |
| 12 | Backend & Sync | 2-3 days | Medium | |
| 13 | **Biometric & Security** | **1-2 days** | **High** | ✅ **NEW** |
| 14 | **Self-Hosted Setup** | **1-2 days** | **Critical** | ✅ **NEW** |
| 15 | Polish & Deployment | 1-2 days | Critical | |

---

## ✅ Phase-wise Todo List (Updated)

### Phase 6: Investments & Tax (NEW)

```markdown
## 6.1 Investment Portfolio
- [ ] Build Investments tab/screen
- [ ] Create Portfolio Dashboard
- [ ] Show total invested vs current value
- [ ] Build portfolio allocation chart (pie/donut)
- [ ] Create returns calculation (absolute, %)
- [ ] Build XIRR calculator for MF

## 6.2 Holdings Management
- [ ] Build Holdings List screen
- [ ] Create Add Investment form
- [ ] Build investment type selector
- [ ] Create stock search (NSE/BSE symbols)
- [ ] Create mutual fund search (scheme codes)
- [ ] Build FD/RD entry form
- [ ] Create PPF/EPF tracking
- [ ] Build Investment Detail screen

## 6.3 Investment Transactions
- [ ] Build Buy transaction form
- [ ] Build Sell transaction form
- [ ] Create SIP tracking
- [ ] Build dividend entry
- [ ] Show transaction history
- [ ] Calculate average buy price

## 6.4 Price Sync
- [ ] Integrate mfapi.in for MF NAV
- [ ] Integrate stock price API
- [ ] Build manual price update
- [ ] Create auto-refresh schedule
- [ ] Show last updated timestamp

## 6.5 Tax Savings Tracker
- [ ] Build 80C Summary screen
- [ ] Show section-wise breakdown
- [ ] Track ₹1.5L limit utilization
- [ ] Build 80D health insurance tracker
- [ ] Create tax-saving recommendations
- [ ] Build annual tax report
```

### Phase 9: Multi-User & Family (NEW)

```markdown
## 9.1 Family Setup
- [ ] Build Create Family screen
- [ ] Create family name input
- [ ] Generate invite code
- [ ] Build Join Family screen
- [ ] Create invite code entry
- [ ] Show pending invites

## 9.2 Family Management
- [ ] Build Family Settings screen
- [ ] Create Member List
- [ ] Build role management (admin/member/viewer)
- [ ] Create permission toggles
- [ ] Build Remove Member flow
- [ ] Create Leave Family option

## 9.3 Shared Features
- [ ] Mark accounts as family-shared
- [ ] Show family account in list
- [ ] Build Family Budget
- [ ] Create family budget allocation
- [ ] Build Family Goals
- [ ] Create family goal contributions

## 9.4 Family Dashboard
- [ ] Build Family Dashboard screen
- [ ] Show combined family balance
- [ ] Create family spending breakdown
- [ ] Build member-wise spending
- [ ] Create Activity Feed
- [ ] Show who added what

## 9.5 Privacy Controls
- [ ] Build privacy settings
- [ ] Hide personal accounts from family
- [ ] Control transaction visibility
- [ ] Create "hidden mode" for sensitive transactions
```

### Phase 10: Voice & OCR (NEW)

```markdown
## 10.1 Voice Entry
- [ ] Build Voice Input button (FAB)
- [ ] Create voice recording UI
- [ ] Implement Web Speech API
- [ ] Build transcript display
- [ ] Create NLP parser for transactions
- [ ] Handle amount extraction (with lakh/crore)
- [ ] Handle category detection
- [ ] Build confirmation screen
- [ ] Show parsed transaction preview
- [ ] Implement edit before save
- [ ] Create voice command help

## 10.2 Receipt OCR
- [ ] Build Scan Receipt button
- [ ] Create camera capture UI
- [ ] Implement image cropping
- [ ] Build image enhancement
- [ ] Integrate Tesseract.js
- [ ] Create receipt parser
- [ ] Extract merchant name
- [ ] Extract amount
- [ ] Extract date
- [ ] Extract GST number (optional)
- [ ] Build confirmation screen
- [ ] Show extracted data preview
- [ ] Allow manual corrections
- [ ] Attach receipt to transaction

## 10.3 OCR Improvements
- [ ] Create merchant database
- [ ] Build merchant-to-category mapping
- [ ] Implement learning from corrections
- [ ] Support multiple receipt formats
- [ ] Build batch receipt scanning
```

### Phase 11: AI Insights Engine (NEW)

```markdown
## 11.1 Insights Generation
- [ ] Build insights engine service
- [ ] Create spending pattern analyzer
- [ ] Build anomaly detection
- [ ] Create savings opportunity finder
- [ ] Build bill prediction
- [ ] Create budget recommendations
- [ ] Build loan prepayment suggestions
- [ ] Create goal achievability analysis

## 11.2 Insights UI
- [ ] Build Insights card on Dashboard
- [ ] Create Insights List screen
- [ ] Build Insight Detail view
- [ ] Create actionable insight buttons
- [ ] Show related transactions
- [ ] Build insight categories
- [ ] Create dismiss/snooze actions

## 11.3 ML Integration (Optional)
- [ ] Set up TensorFlow.js
- [ ] Build spending prediction model
- [ ] Create category classification model
- [ ] Implement on-device inference
- [ ] Build model update mechanism

## 11.4 External AI (Optional)
- [ ] Integrate OpenAI API
- [ ] Create natural language insights
- [ ] Build conversational query ("Why did I overspend?")
- [ ] Implement rate limiting
- [ ] Add API key management
```

### Phase 13: Biometric & Security (NEW)

```markdown
## 13.1 Biometric Authentication
- [ ] Build Biometric Setup screen
- [ ] Implement Web Authentication API
- [ ] Create Face ID prompt (iOS)
- [ ] Create Touch ID prompt (iOS)
- [ ] Create Fingerprint prompt (Android)
- [ ] Store biometric credential
- [ ] Build Biometric Login screen
- [ ] Implement fallback to PIN

## 13.2 PIN Authentication
- [ ] Build Set PIN screen
- [ ] Create 4-6 digit PIN input
- [ ] Build PIN confirmation
- [ ] Create Change PIN flow
- [ ] Build PIN entry screen (on launch)
- [ ] Implement failed attempt tracking
- [ ] Create lockout after 5 failures
- [ ] Build forgot PIN flow

## 13.3 Auto-Lock
- [ ] Implement activity tracking
- [ ] Build auto-lock timer
- [ ] Create lock screen overlay
- [ ] Add "Lock Now" option
- [ ] Create background lock behavior

## 13.4 Device Management
- [ ] Build Devices List screen
- [ ] Show registered devices
- [ ] Create Remove Device option
- [ ] Build login notification
- [ ] Show last login info
```

### Phase 14: Self-Hosted Setup (NEW)

```markdown
## 14.1 Docker Configuration
- [ ] Create Dockerfile for frontend
- [ ] Create Dockerfile for backend
- [ ] Build docker-compose.yml
- [ ] Configure PostgreSQL container
- [ ] Configure Redis container
- [ ] Configure MinIO container
- [ ] Set up Docker volumes
- [ ] Create network configuration

## 14.2 Nginx & SSL
- [ ] Create Nginx configuration
- [ ] Set up reverse proxy rules
- [ ] Configure WebSocket support
- [ ] Create Certbot integration
- [ ] Build SSL auto-renewal

## 14.3 Installation Script
- [ ] Create install.sh script
- [ ] Check system requirements
- [ ] Install Docker if needed
- [ ] Clone repository
- [ ] Generate secrets
- [ ] Configure environment
- [ ] Start services
- [ ] Run health checks

## 14.4 Backup & Maintenance
- [ ] Create backup script
- [ ] Schedule daily backups
- [ ] Build restore script
- [ ] Create update script
- [ ] Build health monitoring
- [ ] Create status dashboard

## 14.5 Documentation
- [ ] Write installation guide
- [ ] Create upgrade guide
- [ ] Document backup procedures
- [ ] Write troubleshooting guide
- [ ] Create video tutorial
```

---

## 🖥️ Deployment Guide (Self-Hosted)

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Storage | 20 GB | 50 GB |
| Network | Static IP | Static IP + Domain |

### Quick Install

```bash
# One-line installation
curl -sSL https://fintrace.in/install.sh | bash

# Or manual installation
git clone https://github.com/yourusername/fintrace.git
cd fintrace
./scripts/install.sh
```

### Docker Compose Structure

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://backend:4000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/fintrace
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - postgres
      - redis
      - minio

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=fintrace
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=fintrace

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    volumes:
      - minio_data:/data
    environment:
      - MINIO_ROOT_USER=${MINIO_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
    command: server /data --console-address ":9001"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Environment Variables

```bash
# .env file
# Database
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret

# MinIO (File Storage)
MINIO_USER=fintrace
MINIO_PASSWORD=your_minio_password

# Domain
DOMAIN=fintrace.yourdomain.com
EMAIL=your@email.com  # For SSL certificates

# Optional: AI Features
OPENAI_API_KEY=sk-xxxx
GOOGLE_VISION_API_KEY=xxxx

# Optional: Account Aggregator
SETU_CLIENT_ID=xxxx
SETU_CLIENT_SECRET=xxxx
```

---

## 📊 Milestones & Deliverables (Updated)

| Milestone | Deliverable | Success Criteria |
|-----------|-------------|------------------|
| M1 | PWA Foundation | Installable on iOS, offline shell |
| M2 | Core Transactions | Add/edit/delete transactions |
| M3 | Dashboard | Beautiful home with all widgets |
| M4 | Budget & Goals | Budget tracking, goal progress |
| M5 | Loan Management | EMI tracking with calculators |
| **M6** | **Investment Portfolio** | **Track MF, stocks, FD, tax savings** |
| M7 | Reports | Charts and analytics |
| M8 | Bank Import | PDF/CSV import working |
| **M9** | **Multi-User Family** | **Family creation, sharing, dashboard** |
| **M10** | **Voice & OCR** | **Voice entry + receipt scanning** |
| **M11** | **AI Insights** | **Smart recommendations working** |
| **M12** | **Biometric Auth** | **Face ID / Fingerprint login** |
| **M13** | **Self-Hosted Deploy** | **One-click Ubuntu installation** |
| M14 | Production Ready | All features, polished UI |

---

## 🔐 Security Considerations (Updated)

### Authentication Layers

```
Layer 1: Server Authentication
├── Email + Password (Argon2 hashed)
├── JWT Access Token (15 min expiry)
└── Refresh Token (7 days, rotated)

Layer 2: App Lock
├── Biometric (Face ID / Fingerprint)
├── PIN (4-6 digits)
└── Auto-lock after inactivity

Layer 3: Sensitive Actions
├── Re-authenticate for:
│   ├── Changing password
│   ├── Adding bank connection
│   ├── Deleting account
│   └── Export data
└── OTP for high-value changes
```

### Data Security

1. **At Rest**
   - PostgreSQL encryption
   - Encrypted backups
   - Secure file storage (MinIO with encryption)

2. **In Transit**
   - HTTPS everywhere
   - TLS 1.3
   - Certificate pinning (mobile)

3. **Privacy**
   - Self-hosted = your data stays with you
   - No telemetry/analytics to third parties
   - User can export & delete all data

---

## 💡 Future Enhancements (Post-MVP)

### Already Included in v2.0:
- ✅ Investment Tracking
- ✅ Family Sharing
- ✅ AI Insights
- ✅ Voice Entry
- ✅ Receipt OCR

### Future Roadmap:
1. **Bill Splitting** - Split with friends (not just family)
2. **Widget Support** - iOS/Android home screen widgets
3. **Apple Watch** - Quick expense entry
4. **Credit Score** - Track and improve credit score
5. **Tax Filing** - Generate ITR-ready reports
6. **Insurance Tracker** - Policy management
7. **Subscription Manager** - Track recurring subscriptions
8. **Net Banking Integration** - Direct bank sync (beyond AA)
9. **WhatsApp Bot** - Add expenses via WhatsApp
10. **Telegram Bot** - Expense tracking bot

---

## 📝 Notes & Decisions

### Why These Choices?

| Decision | Reasoning |
|----------|-----------|
| **Self-hosted over Cloud** | Privacy-first, user owns data |
| **Docker Compose** | Easy deployment, reproducible |
| **MinIO over S3** | Self-hosted S3-compatible storage |
| **Tesseract.js** | Free, runs in browser, no API costs |
| **Web Speech API** | Native browser support, no cost |
| **PostgreSQL** | ACID compliance for financial data |
| **Fastify** | 2x faster than Express |
| **React PWA** | Works on iOS, Android, Web from one codebase |

---

## ✍️ Sign-Off

**App Name:** FinTrace
**Domain:** fintrace.in
**Prepared by:** AI Assistant
**Date:** February 6, 2026
**Version:** 2.0
**Status:** Ready for Development

---

## ✅ Final Checklist

- [x] App name finalized: **FinTrace**
- [x] Domain identified: **fintrace.in**
- [x] Multi-user support: **Yes (Family)**
- [x] Self-hosted: **Ubuntu with Docker**
- [x] Biometric auth: **Face ID / Fingerprint**
- [x] Family tracking: **Shared accounts, budgets, goals**
- [x] AI insights: **Spending patterns, recommendations**
- [x] Investment tracking: **MF, Stocks, FD, PPF, NPS**
- [x] Voice entry: **Web Speech API**
- [x] Receipt OCR: **Tesseract.js**
- [x] India-tailored: **UPI, 80C, GST, Indian banks**
- [x] Tech stack: **React + Fastify + PostgreSQL**
- [x] Phases defined: **15 phases with detailed todos**

---

**Ready to start development?**

Confirm and I'll begin with **Phase 1: Foundation & Core Setup**! 🚀
