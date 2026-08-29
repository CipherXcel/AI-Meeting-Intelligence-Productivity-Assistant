# MeetAgent AI — Autonomous Meeting Intelligence & Cloud Productivity Assistant 🤖📅

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B%20LTS-green.svg)](https://nodejs.org/)
[![Next.js Version](https://img.shields.io/badge/Next.js-16.3.0-black.svg)](https://nextjs.org/)
[![AWS Cloud](https://img.shields.io/badge/AWS-EC2%20%7C%20S3%20Versioning-orange.svg)](https://aws.amazon.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%203.6%20Flash-blue.svg)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-PostgreSQL%2016-blue.svg)](https://www.docker.com/)

**MeetAgent** is a full-stack AI calendar assistant that connects with Google Calendar to automate meeting scheduling, generate Google Meet links, and give you daily schedule briefings through natural conversation. It also includes an S3-backed cloud storage keeper with object versioning for storing meeting notes, slide decks, and event flyers.

---

## 🚀 Live Production Deployment

The application is deployed live on AWS Cloud Infrastructure (Ubuntu 24.04 LTS):
* **🌐 Production Web App**: `http://YOUR_EC2_PUBLIC_IP`
* **📦 Cloud Storage & Image Keeper**: `http://YOUR_EC2_PUBLIC_IP/storage`
* **📡 Backend API Endpoint**: `http://YOUR_EC2_PUBLIC_IP/api`

---

## 🏗️ System Architecture

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                AWS CLOUD INFRASTRUCTURE (VPC)                             │
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              AWS EC2 (Ubuntu 24.04 LTS)                             │  │
│  │                                                                                     │  │
│  │         [ Internet Inbound Traffic: Port 80 (HTTP) / Port 443 (HTTPS) ]             │  │
│  │                                       │                                             │  │
│  │                                       ▼                                             │  │
│  │                           ┌───────────────────────┐                                 │  │
│  │                           │  Nginx Reverse Proxy  │                                 │  │
│  │                           └───────────┬───────────┘                                 │  │
│  │                                       │                                             │  │
│  │            ┌──────────────────────────┴──────────────────────────┐                  │  │
│  │            ▼                                                     ▼                  │  │
│  │   ┌──────────────────┐                                  ┌──────────────────┐        │  │
│  │   │    Next.js 16    │                                  │    Express.js    │        │  │
│  │   │  Frontend Server │                                  │    API Server    │        │  │
│  │   │   (PM2 :3000)    │                                  │   (PM2 :4000)    │        │  │
│  │   └────────┬─────────┘                                  └────────┬─────────┘        │  │
│  │            │                                                     │                  │  │
│  │            ▼                                                     ▼                  │  │
│  │   ┌──────────────────┐                                  ┌──────────────────┐        │  │
│  │   │ Descope Auth SDK │                                  │ Mastra AI Engine │        │  │
│  │   │ (PKCE & Social)  │                                  │ (Agentic Core)   │        │  │
│  │   └──────────────────┘                                  └────────┬─────────┘        │  │
│  │                                                                  │                  │  │
│  │                           ┌──────────────────────────────────────┼─────────────┐    │  │
│  │                           ▼                                      ▼             ▼    │  │
│  │                  ┌──────────────────┐                   ┌────────────────┐ ┌──────┐ │  │
│  │                  │  PostgreSQL 16   │                   │ Google Gemini  │ │Google│ │  │
│  │                  │ (Docker :5432)   │                   │ 3.6 Flash LLM  │ │Cal   │ │  │
│  │                  └──────────────────┘                   └────────────────┘ └──────┘ │  │
│  └───────────────────────────┬─────────────────────────────────────────────────────────┘  │
│                              │                                                            │
│                              ▼                                                            │
│                 ┌─────────────────────────┐                                               │
│                 │  AWS S3 Bucket Storage  │                                               │
│                 │ (Object Versioning On)  │                                               │
│                 └─────────────────────────┘                                               │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Engineering Features

### 📅 1. Autonomous Calendar Intelligence
* **Conversational Natural Language Interface**: Users interact in plain English; the Mastra Agent autonomously translates intents into Google Calendar API calls (e.g., *"Schedule a 45-min sync with Priyanshu tomorrow at 3 PM"*).
* **Automatic Google Meet Link Injection**: Programmatically creates and attaches secure Google Meet video conference URLs and sends calendar invitations to attendees.
* **Proactive Schedule Briefings**: Summarizes all scheduled events for the day, flags overlapping time conflicts, and delivers attendee context.
* **Conflict-Free Rescheduling**: Autonomously inspects existing calendar slots, cancels obsolete meetings, and updates schedules without double-booking.

### 📦 2. Cloud Object Storage & Versioning (AWS S3)
* **Multi-Tenant Storage Quota (500 MB)**: Enforces individual storage limits per user with dynamic visual capacity progress indicators.
* **AWS S3 Object Versioning**: Transparently archives previous revisions of files when overwritten under the same key.
* **Version History Modal**: Allows users to inspect historical revisions, view exact S3 `VersionId` tags, and download or restore past versions.
* **Live Media Gallery & Lightbox**: Instant visual rendering for images (`PNG`, `JPG`, `WEBP`, `SVG`, `GIF`) and formatted document badges for `PDF`, `DOCX`, `TXT`.
* **Python Boto3 Automation**: Standalone automation script (`s3_storage_automation.py`) demonstrating programmatic bucket provisioning, versioning configuration, multi-version uploads, and historical rollbacks.

### 🤖 3. Agentic AI & Multimodal Processing
* **Mastra Agentic AI Framework**: Modular tool execution, event loops, and streaming responses (`SSE / chunked streams`).
* **Google Gemini 3.6 Flash**: High-speed, low-latency reasoning and vision capabilities for document OCR and scheduling.
* **Thread & State Persistence**: Conversation memory persisted per authenticated user in PostgreSQL.

### 🔐 4. Enterprise Security & Infrastructure Isolation
* **Passwordless Authentication**: Powered by Descope (Magic Link, Google OAuth2, Session Tokens).
* **Zero-Leak Secret Isolation**: API keys and private `.pem` SSH certificates isolated strictly on-server.

---

## 🛠️ Complete Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Cloud Infrastructure** | **Amazon Web Services (AWS)** — EC2 (`t3.micro`), S3 (Object Storage & Versioning), VPC, Security Groups |
| **Operating System** | **Ubuntu Server 24.04 LTS** (x86_64) configured with 2GB Linux Swap Space |
| **Web Server & Reverse Proxy** | **Nginx** (HTTP Port 80 routing, Gzip Compression, Header Forwarding) |
| **Process Management** | **PM2 (Process Manager 2)** — Zero-downtime clustering, background daemons, systemd auto-restart |
| **Containerization** | **Docker & Docker Compose** (PostgreSQL 16 containerization) |
| **Frontend Framework** | **Next.js 16.3.0 (App Router, Turbopack)**, React 19, TypeScript |
| **Styling & UI Components** | **Tailwind CSS v4**, Lucide Icons, Radix UI primitives, Custom Glassmorphic Dark Design |
| **Backend Framework** | **Node.js v20+ LTS**, **Express.js 5**, TypeScript (`tsx` runtime) |
| **AI / Agent Engine** | **Mastra Agentic SDK (`@mastra/core`)**, **Google Gemini API (`@google/genai`)** |
| **Database** | **PostgreSQL 16** with raw SQL schema migrations and connection pooling (`pg`) |
| **Authentication** | **Descope SDK** (`@descope/nextjs-sdk`, `@descope/node-sdk`) |
| **Storage SDKs** | AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`), Python **Boto3** SDK, Multer |

---

## 📁 Repository Structure

```
AI-Meeting-Intelligence-Productivity-Assistant/
├── backend/                                   # Express.js REST API & AI Agent Server
│   ├── src/
│   │   ├── config/                            # Descope, Memory & Agent Instructions
│   │   ├── db/                                # PostgreSQL Connection Pool
│   │   ├── mcp/                               # Calendar MCP Tools & Server Mounts
│   │   ├── middleware/                        # Session Authentication Middleware
│   │   ├── repositories/                      # User & Connection DB Repositories
│   │   ├── routes/                            # Agent, Calendar & Cloud Storage Routes
│   │   ├── services/                          # Gemini AI Agent, Calendar & S3 Services
│   │   └── index.ts                           # Server Entrypoint (Port 4000)
│   ├── scripts/                               # SQL Migration Runner (scripts/migrate.ts)
│   ├── sql/                                   # Database Schema Migrations (001_users.sql, 002_connections.sql)
│   ├── .env.example                           # Backend Environment Template
│   ├── package.json                           # Backend Dependencies & Metadata
│   └── tsconfig.json                          # TypeScript Compiler Options
│
├── frontend/                                  # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/page.tsx             # Main AI Agent Chat & Calendar Dashboard
│   │   │   ├── storage/page.tsx               # Cloud Storage Keeper & Versioning Gallery
│   │   │   ├── sign-in/page.tsx               # Dedicated Authentication Page
│   │   │   ├── layout.tsx                     # Root Layout & Descope Auth Provider
│   │   │   ├── page.tsx                       # Starting Interface & Feature Simulator
│   │   │   └── globals.css                    # Tailwind CSS & Glassmorphism Theme
│   │   ├── components/
│   │   │   ├── brand/logo.tsx                 # SVG MeetAgent Brand Assets
│   │   │   ├── dashboard/                     # Chat Panel, Markdown Renderer, Connections
│   │   │   └── ui/                            # Buttons, Cards, Badges, Tooltips
│   │   └── lib/                               # API Client, Descope Helpers & Types
│   ├── .env.example                           # Frontend Environment Template
│   ├── package.json                           # Frontend Dependencies & Metadata
│   └── tsconfig.json                          # TypeScript Compiler Options
│
├── docker-compose.yml                         # PostgreSQL Container Configuration
├── s3_storage_automation.py                   # Standalone Python Boto3 S3 Automation Script
├── aws_cloud_assignment_guide.md              # Complete AWS Cloud Deployment Guide
├── .gitignore                                 # Git Ignore Rules
└── README.md                                  # Production Documentation
```

---

## ⚡ Quick Start: Local Development

### 1. Prerequisites
* [Node.js 20+ LTS](https://nodejs.org/)
* [Docker Desktop](https://www.docker.com/)
* [Git](https://git-scm.com/)

### 2. Clone Repository
```bash
git clone https://github.com/CipherXcel/AI-Meeting-Intelligence-Productivity-Assistant.git
cd AI-Meeting-Intelligence-Productivity-Assistant
```

### 3. Start PostgreSQL Database
```bash
docker compose up -d
```

### 4. Configure & Start Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials (Descope Project ID & Google Gemini API Key)
npm install
npm run migrate
npm run dev
```

### 5. Configure & Start Frontend
```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ☁️ Production Operations (AWS EC2)

```bash
# Check PM2 Process Status
pm2 list

# Stream Live Application Logs
pm2 logs meetagent-backend
pm2 logs meetagent-frontend

# Reload Application with Zero Downtime
pm2 reload all

# Test & Reload Nginx Reverse Proxy
sudo nginx -t
sudo systemctl reload nginx
```

---

## 👨‍💻 Author & Maintainer

* **Priyanshu Raj** — Full-Stack & Cloud Developer
* **GitHub**: [@CipherXcel](https://github.com/CipherXcel)
* **Repository**: [AI-Meeting-Intelligence-Productivity-Assistant](https://github.com/CipherXcel/AI-Meeting-Intelligence-Productivity-Assistant)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

*"MeetAgent AI: Don't just attend meetings. Master them with Cloud & Agentic Intelligence."*
