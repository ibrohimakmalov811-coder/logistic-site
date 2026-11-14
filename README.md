# TransFlow — Logistics Platform for Uzbekistan (Plan A: Company's Own Drivers)

> **Modern logistics management platform** designed specifically for transport companies, dispatchers, and truck drivers in Uzbekistan.
> 
> Replaces chaotic phone calls and scattered Telegram group chats with unified dispatching, milestone tracking, and instant proof of delivery (PoD).

---

## ⚠️ Important Limits of this Version (Plan A Demo)

- **Browser-Only Demo Mode:** This version operates entirely within **one browser** using `localStorage` (for relational entities) and `IndexedDB` (for compressed photo delivery proofs). Data is stored locally and is **not shared between separate physical devices**.
- **Do Not Enter Real Personal Data:** Because data is stored in the browser's local storage without a secure server backend, users must **not** enter real sensitive personal or financial information.
- **Visible In-App Notice:** A persistent banner is displayed at the top of the interface:
  > *"Demo rejimi: Ma'lumotlar faqat ushbu brauzerda saqlanadi. Iltimos, haqiqiy shaxsiy ma'lumotlarni kiritmang."*

---

## 🔄 Two-Tab Live Demonstration (Dispatcher & Driver)

To demonstrate the full interaction between the Company and Driver sides without needing two computers:

1. **Open Tab 1 (Dispatcher / Owner):**
   - Visit `http://localhost:3000/uz/app/company`.
   - In the top demo banner, click **Egasi** (`Akmal Karimov`) or **Dispetcher** (`Dilshod Rahimov`).
   - Navigate to **Buyurtmalar** (Orders) or **Haydovchilar** (Drivers).

2. **Open Tab 2 (Driver):**
   - In the same browser, open a second tab: `http://localhost:3000/uz/app/driver`.
   - In the top demo banner of Tab 2, click **Haydovchi** (`Jamshid Aliyev`).
   - Tab 2 will switch to the Driver portal, while Tab 1 remains in the Company portal!

3. **Experience Real-Time Sync:**
   - In Tab 1 (Company), create a new order and assign it to `Jamshid Aliyev`.
   - Watch Tab 2 (Driver): The new order immediately appears under **Kutilayotgan** (Upcoming) without page refresh via `BroadcastChannel`!
   - In Tab 2 (Driver), click **Yo'lga chiqish** (Start transit), then click **Yetkazib berishni tasdiqlash** (Upload delivery proof photo).
   - Watch Tab 1 (Company): The order status updates instantly to `Yetkazilgan` (Delivered) and the uploaded photo is visible in the order detail view!

---

## 🔑 Pre-Seeded Demo Accounts

All demo accounts share the password: `password123`

| Role | Name | Identifier (Email / Phone) | Default Role |
| :--- | :--- | :--- | :--- |
| **Company Owner** | Akmal Karimov | `company@transflow.uz` / `+998901234567` | `company_owner` |
| **Dispatcher** | Dilshod Rahimov | `dispatcher@transflow.uz` / `+998901234568` | `dispatcher` |
| **Driver 1** | Jamshid Aliyev | `driver@transflow.uz` / `+998901234569` | `driver` |
| **Driver 2** | Sardor Toshmatov | `driver2@transflow.uz` / `+998901234570` | `driver` |

You can also use the one-click **Role Switcher** in the top yellow Demo Banner at any time.

---

## 🏗 Architecture & Repository Pattern

All data access is strictly isolated behind formal TypeScript repository interfaces in `src/lib/data/repositories/contracts.ts`:
- `IUserRepository`: User profiles, Web Crypto PBKDF2 hashed credentials, and sessions.
- `ICompanyRepository`: Company entity, active memberships, and driver profiles.
- `IInviteRepository`: Secure 8-character invite codes (`ABCD-2K7M`), SHA-256 hash validation, and 5-attempt rate-limit lockout.
- `IVehicleRepository`: Fleet CRUD (tent, isotherm, refrigerator, container, flatbed, dump).
- `IOrderRepository`: Orders lifecycle state machine (`new` -> `assigned` -> `in_transit` -> `delivered`, `cancelled`), status history timeline, and delivery proof submissions.
- `INotificationRepository`: In-app notification bell with unread counters and deep links.

UI components **never** access `localStorage` or `IndexedDB` directly. When migrating to Supabase in Plan B, only the repository classes in `src/lib/data/` are swapped — zero UI changes required. See [MIGRATION.md](MIGRATION.md) for full details.

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Development Server
```bash
pnpm dev
```
Open `http://localhost:3000` (redirects to `http://localhost:3000/uz`).

### 3. Verify Code Quality & i18n
```bash
pnpm typecheck      # TypeScript compilation check (0 errors)
pnpm check:i18n     # Strict i18n parity check across uz, ru, en (733 keys)
pnpm lint           # Next.js ESLint verification
```

---

## 📖 Logistics Glossary

A multilingual dictionary of logistics terms (UZ, RU, EN) is available at:
👉 [`src/data/glossary.ts`](src/data/glossary.ts)
