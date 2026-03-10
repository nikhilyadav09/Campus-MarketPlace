# 🎓 Campus Marketplace

A secure, transactional peer-to-peer marketplace designed to solve the chaos of unorganized campus buying and selling.

---

## Table of Contents

- [Problem Statement](#-problem-statement)
- [System Overview](#-system-overview)
- [Assumptions](#-assumptions)
- [Architecture](#️-architecture)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Out of Scope](#-out-of-scope-intentional-decisions)
- [Future Enhancements](#-future-enhancements)
- [Setup & Run](#-setup--run)

## 🧐 Problem Statement

Campus communities often struggle with peer-to-peer listings due to:

- Listings being scattered across chats and notice boards
- Unclear availability of items
- Multiple users attempting to claim the same item
- Resulting conflicts and misunderstandings

**Chosen Problem: Unclear Availability**

This project intentionally focuses on solving the **unclear availability** problem.

**Why Availability?**

Unclear availability is the core issue that triggers many of the other problems:

- When availability is not explicit, listings naturally become scattered across multiple platforms.

- Lack of availability guarantees leads to multiple users attempting to claim the same item simultaneously.

- This directly results in conflicts, confusion, and poor user experience.

By designing the system around explicit, enforceable availability, the solution indirectly addresses:

- Listing fragmentation

- Double-claiming of items

- Conflicts and misunderstandings

Rather than tackling every symptom independently, this project treats availability as the **single source of truth**.

---

## 📖 System Overview

The application follows a strict **Single Source of Truth** architecture.

### Core Workflow
1.  **Listing**: A Seller lists an item (Status: `available`).
2.  **Reservation**: A Buyer reserves the item. The backend performs an atomic transaction to creation a reservation and lock the item (Status: `reserved`).
3.  **Exclusivity**: During the reservation period, it prevents other buyers from purchasing the item.
4.  **Resolution**: 
    *   **Sale**: Seller confirms the transaction (Status: `sold`).
    *   **Cancel**: Buyer cancels or timer expires (Status: `available`).

## 🧠 Assumptions

- The platform is designed for informal, peer-to-peer exchanges within the student community, rather than institution-managed or official college listings.
- Users are assumed to be pre-identified for the purpose of the demo.
- All users act through a single centralized platform rather than external channels.

---

## 🏗️ Architecture

```mermaid
graph TD
    User((User))
    subgraph "Frontend (Vite + React)"
        UI[User Interface]
        API_Client[API Client Layer]
        UI --> API_Client
    end
    
    subgraph "Backend (Flask)"
        API_Client <-->|JSON / HTTP| Routes[API Routes]
        Routes --> Services[Business Services]
        Services --> DB_Pool[Connection Pool]
    end
    
    subgraph "Data Persistence"
        DB_Pool <-->|SQL / Psycopg3| VS[(PostgreSQL)]
    end
```

### Component Breakdown

*   **Frontend**: React (Vite)
*   **Backend**: Flask
*   **Database**: PostgreSQL with `psycopg`

---

## 💾 Database Schema

The database relies on foreign key constraints and atomic transactions to ensure data integrity.

### `items`
The core inventory table.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary Key |
| `title` | VARCHAR | Item name |
| `price` | DECIMAL | Selling price |
| `status` | VARCHAR | `available`, `reserved`, `sold` |
| `seller_id` | UUID | FK to Users |
| `category_id` | UUID | FK to Categories |

### `reservations`
Manages the temporary lock on items.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary Key |
| `item_id` | UUID | FK to Items (Unique when status='active') |
| `buyer_id` | UUID | FK to Users |
| `status` | VARCHAR | `active`, `completed`, `cancelled` |
| `expires_at` | TIMESTAMP | When the reservation auto-expires |

### `users`
Demo users for the simulation.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary Key |
| `name` | VARCHAR | Display name (e.g., "Ajay", "Ritik") |
| `email` | VARCHAR | Unique identifier |

---

## 🔌 API Reference

### Items API

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/items` | List items. Filters: `category_id`, `status`. |
| `POST` | `/items` | Create a new listing. Req: `title`, `price`, `seller_id`. |
| `GET` | `/items/<id>` | Get details for a specific item. |
| `POST` | `/items/<id>/sold` | Direct sale (bypass reservation). |

### Reservations API

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/reservations` | List active bookings. |
| `POST` | `/reservations` | Reserve an item. Req: `item_id`, `buyer_id`. |
| `POST` | `/reservations/<id>/confirm` | **Seller Action**: Complete the sale. |
| `POST` | `/reservations/<id>/cancel` | **Buyer Action**: Release the item. |

---

## 🚫 Out of Scope (Intentional Decisions)

To keep the system focused on solving availability with clarity and correctness, the following were intentionally excluded:

- **Payment integration**  
  Payment flows introduce disputes, reversals, and edge cases that are orthogonal to availability enforcement.  
  Excluding payments keeps the system focused on reservation correctness rather than financial resolution.

- **Authentication & authorization**  
  The system assumes pre-identified users to reduce onboarding friction and demo complexity.  
  This avoids introducing identity-related failure modes that do not impact availability logic.

- Messaging or chat between buyers and sellers  
- Recommendation or ranking algorithms  
- Moderation or dispute-resolution workflows  

These exclusions ensure the system demonstrates a clear, enforceable availability model without masking issues behind auxiliary features.


## 🔮 Future Enhancements

This system is intentionally extensible. Possible future improvements include:

- **Event tracking & notifications**  
  Instrumenting key lifecycle events (reservation created, expired, completed) and notifying users in real time via push, email, or in-app alerts.

- **Authentication & authorization**  
  Introducing proper identity management to support role-based actions and secure access.

- **Real-time availability updates**  
  Using WebSockets or Server-Sent Events to reflect availability changes instantly across clients.

- **Payment integration**  
  Adding escrow-based or wallet-based payments without altering the availability enforcement model.

- **Analytics & audit logs**  
  Tracking reservation outcomes to identify friction points and optimize system behavior.


---

## 🚀 Setup & Run

We include a unified runner script that handles dependency setup and process management for both backend and frontend.

### Prerequisites
*   **Python 3.10+**
*   **Node.js 18+**
*   **PostgreSQL** (Service must be running)

### 1. Database Setup
1. Create a local database named `campus_marketplace`.
2. Navigate to the `backend` folder and create a `.env` file.
3. Add your database URL to the `.env` file:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/campus_marketplace"
   ```
   > **Note**: If your password contains special characters (like `@`), encode them (e.g., `%40`).
   > **Note**: If your port is different from 5432, change it in the DATABASE_URL.

### 2. Auto-Start
The `run.py` script will create a virtual environment, install dependencies (pip & npm), seed the database, and start both servers.

```bash
python run.py
```

### Project Structure
```text
/
├── backend/
│   ├── app.py              # Application Entry Point
│   ├── services/           # Domain Logic (Reservations, Items)
│   ├── db.py               # Database Connection Handling
│   └── requirements.txt    # Python Dependencies
│
├── frontend/
│   ├── src/
│   │   ├── pages/          # Full Page Views
│   │   ├── components/     # UI Components
│   │   └── api/            # API Wrappers
│   └── package.json        # JS Dependencies
│
└── run.py                  # Automation Runner
```
