# Timar Web: Water Treatment Plant CMMS (PWA & Google Cloud / Apps Script Sync)

A cross-platform, offline-first Progressive Web App (PWA) designed for water treatment plant maintenance operations on Windows desktop and Android mobile devices, backed by Google Sheets and Google Apps Script with automated two-way synchronization and role-based access control.

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural updates below directly integrate your confirmed requirements:
> - **Role-Based Access Control (RBAC)**: Distinct permissions for **Technical Managers** (full authority over assets, schedules, inventory, and approvals) and **Field Technicians** (read-only master data, logging maintenance reports, and submitting completion requests).
> - **User Authentication**: Username and password credentials stored in a dedicated `Users` tab in Google Sheets and cached securely in local IndexedDB for seamless offline login.
> - **Event Completion & Approval Workflow**: When a technician completes a maintenance task, they submit an event completion request marked as `Pending Approval`. Managers review, adjust, and approve the event from a dedicated Review Queue, which finalizes the inventory deductions and advances recurring schedules.

- **Confirmed Decision 1**: Google Sheets database with Google Apps Script Web App API (`doGet` / `doPost`).
- **Confirmed Decision 2**: Full PWA running on Windows desktop and Android mobile with standalone installation and service worker caching.
- **Confirmed Decision 3**: Offline-first two-way synchronization via IndexedDB with Last-Write-Wins and change queue.
- **Confirmed Decision 4**: Role-based access control with `manager` and `technician` tiers.
- **Confirmed Decision 5**: Multi-step maintenance workflow where technician task completions require manager approval before finalization.

---

## 1. Overview & Core Concept

### What It Does
**Timar Web** brings the capabilities of the original C++ Qt desktop application (`Amir-GHB/Timar`) into a cross-platform, installable industrial web app with enterprise-grade user management:
- **Hierarchical Plant Assets**: Visual tree structure covering all water plant processes (Intake, Coagulation/Flocculation, Clarifiers, Chemical Dosing, Multimedia & Carbon Filters, RO Units, Disinfection, Sludge Handling).
- **Role-Gated Workflows**: Technicians execute tasks and request completion approvals; managers supervise, configure plant schedules, manage spare parts, and sign off on completed work orders.
- **Offline Reliability**: Plant technicians working in underground pump galleries or electrical switchgear rooms without cellular signal can still access asset datasheets, log work orders, and submit completion requests; all data queues locally in IndexedDB and synchronizes automatically upon reconnecting to plant Wi-Fi.
- **Spare Parts Inventory**: Stock tracking with automated deductions upon manager approval of work orders.
- **Bilingual & Dual Calendar**: Native Gregorian and Persian (Solar Hijri) calendar support with Vazirmatn typography matching the original Timar desktop application.

### Target Audience & Persona
- **Technical Manager / Plant Supervisor**: Uses Windows desktop in the control room or office to plan maintenance, add assets, create recurring schedules, adjust inventory thresholds, and review pending technician sign-offs.
- **Field Technician**: Uses Android phones or rugged tablets on the plant floor to inspect equipment, view SOPs, report unexpected equipment breakdowns, and submit completion requests with hours and parts consumed.

---

## 2. User Experience & Visual Design

### Role-Based User Experience & Permissions

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│        Technical Manager             │           Field Technician           │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ • Full CRUD on Assets & Sub-Assets   │ • Read-only access to Plant Assets   │
│ • Create, edit, and cancel Schedules │ • View active & upcoming Schedules   │
│ • Review & Approve Event Requests    │ • Submit Event Completion Requests   │
│ • Add & update Spare Parts Inventory │ • Report new Breakdown / Work Orders │
│ • Manage Users & Sync Configuration  │ • View Spare Parts stock levels      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Key User Flows

1. **Technician Workflow: Executing & Requesting Event Completion**:
   - Technician logs in on Android phone (or offline cached session).
   - Selects an assigned or scheduled task (e.g. `Filter Feed Pump P-201: Replace Mechanical Seal`).
   - Taps **"Submit Completion Request"**: enters actual duration (e.g. 2.5 hours), technician notes, and selects used parts from inventory (`Mechanical Seal 45mm` $\times 1$, `O-Ring Kit` $\times 1$).
   - The event status is saved as `Pending Approval` locally and queued for cloud sync.

2. **Manager Workflow: Reviewing & Approving Work Orders**:
   - Manager logs into the desktop dashboard; a notification counter shows **"3 Events Pending Approval"**.
   - Manager inspects the technician's notes, hours, and consumed parts.
   - Manager clicks **"Approve & Close"**:
     - Event status transitions to `Completed`.
     - Spare parts stock is formally deducted from the inventory ledger.
     - Associated recurring schedule automatically calculates its next due date based on interval rules.

3. **Technician Workflow: Reporting Breakdown / Urgent Event**:
   - Technician discovers an unexpected issue (e.g. high vibration on Blower B-101).
   - Taps **"Report Incident / Event"**: flags priority as `Emergency / Breakdown`, adds description, and immediately notifies the plant team via local/cloud sync.

### Visual Identity & Theme
- **Aesthetic Direction**: Modern industrial Fluent design (subtle 1px borders, high-density scannable tables, zero pill badges on cards, quiet unboxed metadata).
- **Color Palette**:
  - Neutral Canvas: Light Slate (`#F8FAFC` / `#FFFFFF`) with dark mode support.
  - Accent: Industrial Teal & Water Blue (`#0284C7`).
  - Semantic Status:
    - `Completed`: Green (`#16A34A`)
    - `Pending Approval`: Amber / Indigo (`#D97706` / `#4F46E5`)
    - `Scheduled / In Progress`: Blue (`#0284C7`)
    - `Breakdown / Overdue`: Red (`#DC2626`)
- **Typography**:
  - English/Display: `Plus Jakarta Sans`.
  - Persian/Farsi: `Vazirmatn`.
  - Serials & Quantities: `JetBrains Mono` with `tabular-nums`.

---

## 3. Key Product Decisions & Trade-Offs

### 1. User Authentication Stored in Google Sheets
- **Chosen Approach**: A `Users` sheet storing `username`, `passwordHash` (or password string for lightweight plant use), `role`, `fullName`, and `isActive`.
- **Offline Handling**: Successful logins generate a signed local session token cached in IndexedDB. Technicians can continue opening the app and submitting work orders even without network access.
- **Why**: Allows supervisors to manage plant personnel directly in their Google Sheet without external identity providers or monthly authentication costs.

### 2. Multi-Step Event Lifecycle (Draft $\rightarrow$ Pending Approval $\rightarrow$ Approved)
- **Chosen Approach**: Event records include `status: 'scheduled' | 'in_progress' | 'pending_approval' | 'completed' | 'rejected'`, with `submittedBy` and `approvedBy` audit fields.
- **Why**: Protects data integrity for critical water treatment operations, preventing accidental inventory depletion or unauthorized schedule resets while giving field technicians the power to document work in real time.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Timar Cross-Platform PWA                        │
│               (Windows Desktop Edge/Chrome & Android Mobile)            │
├───────────────────────────────────┬────────────────────────────────────┤
│           UI Layer                │         Auth & Role Guard          │
│ ┌───────────────┬───────────────┐ │ ┌────────────────────────────────┐ │
│ │  Asset Tree   │ Approval Queue│ │ │  authStore                     │ │
│ ├───────────────┼───────────────┤ │ │  • currentUser (Role: Mgr/Tech)│ │
│ │  Schedules    │  Event Logger │ │ │  • token / offline session     │ │
│ ├───────────────┼───────────────┤ │ └────────────────┬───────────────┘ │
│ │  Spare Parts  │  Sync Center  │ │                  │ Role Gates      │
│ └───────────────┴───────────────┘ │ ┌────────────────▼───────────────┐ │
│                                   │ │ Reactive Data Stores           │ │
│                                   │ │ • assetsStore   • eventsStore  │ │
│                                   │ │ • inventoryStore• syncStore    │ │
│                                   │ └────────────────┬───────────────┘ │
├───────────────────────────────────┴──────────────────┼─────────────────┤
│                    Offline Persistence Layer         │                 │
│ ┌────────────────────────────────────────────────────▼───────────────┐ │
│ │              IndexedDB (Local Offline Database)                    │ │
│ │  • users   • assets   • subassets   • events   • schedules         │ │
│ │  • inventory   • syncQueue (pending mutations)                     │ │
│ └────────────────────────────────────┬───────────────────────────────┘ │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │ Auto-Sync (Background HTTP POST)
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Google Apps Script Web App API                      │
│                           (`Code.gs`)                                  │
│  • doPost({action: "login", ...})                                      │
│  • doPost({action: "syncPush", mutations: [...]})                      │
│  • doGet({action: "syncPull", sinceTimestamp: ...})                   │
├────────────────────────────────────────────────────────────────────────┤
│                       Google Sheets Database                           │
│  [Users]  [Assets]  [SubAssets]  [Events]  [Schedules]  [Inventory]    │
└────────────────────────────────────────────────────────────────────────┘
```

### Google Sheets Tables & Entity Schemas

1. **`Users`**:
   `id`, `username`, `password`, `fullName`, `role` (`manager` | `technician`), `department`, `isActive`, `updatedAt`
2. **`Assets`**:
   `id`, `name`, `code`, `parentId`, `category`, `status`, `serialNumber`, `location`, `specs`, `installDate`, `updatedAt`, `isDeleted`
3. **`SubAssets`**:
   `id`, `assetId`, `name`, `partNumber`, `serialNumber`, `status`, `notes`, `updatedAt`, `isDeleted`
4. **`Events`**:
   `id`, `assetId`, `title`, `type` (Preventive / Corrective / Breakdown), `date`, `technicianId`, `technicianName`, `durationHours`, `description`, `partsUsed` (JSON), `status` (`pending_approval` | `completed` | `rejected`), `approvedBy`, `approvalNotes`, `updatedAt`, `isDeleted`
5. **`Schedules`**:
   `id`, `assetId`, `taskTitle`, `intervalType` (Days / Weeks / Months / Hours), `intervalValue`, `lastPerformedDate`, `nextDueDate`, `status`, `assignedTo`, `updatedAt`, `isDeleted`
6. **`Inventory`**:
   `id`, `partName`, `partNumber`, `category`, `quantityInStock`, `unit`, `minThreshold`, `unitCost`, `shelfLocation`, `updatedAt`, `isDeleted`

---

## 5. Execution Steps

1. **Step 1: PWA Infrastructure & In-App Installation**:
   - Configure `vite-plugin-pwa` with manifest (192x192, 512x512 icons, theme color `#0284C7`, standalone mode).
   - Implement `usePWAInstall` hook and install button for Windows and Android.
   - Configure online/offline status detection banner.

2. **Step 2: Authentication & Role-Based Access Control**:
   - Implement `authStore` with login modal, role-based route/view protections, and user switching.
   - Seed default demo accounts:
     - **Manager**: `manager` / `admin123` (Full CRUD + approvals)
     - **Technician**: `tech1` / `tech123` (Read-only master data + event submission)

3. **Step 3: Offline Storage Engine & Conflict-Free Sync Engine**:
   - Implement IndexedDB (`src/services/db.ts`) for all entities, users, and the offline mutation queue.
   - Seed realistic water treatment plant dataset (Pumps, RO skids, Clarifiers, Chemical Dosing, Sand Filters, Spare Parts).
   - Implement two-way sync engine (`src/services/syncEngine.ts`) with Last-Write-Wins and conflict logs.

4. **Step 4: Standalone Google Apps Script Code (`Code.gs`)**:
   - Write comprehensive `Code.gs` for the user's Google Sheet:
     - `setupSheets()`: Automatically initializes all 6 sheets with styled headers and default users.
     - `doPost()`: Authentication endpoint + atomic batch mutations.
     - `doGet()`: Delta sync endpoint fetching changes since client timestamp.
   - In-app setup modal displaying the script and instructions for 1-click deployment.

5. **Step 5: UI Components & Industrial Workflows**:
   - **Top Bar**: Plant brand, current logged-in user profile chip with role tag, language/calendar switcher (Persian Solar Hijri / Gregorian), sync status indicator, PWA install button.
   - **Asset Tree & Details**: Hierarchical navigation; managers see edit/delete buttons; technicians see specs, documentation, and maintenance history.
   - **Maintenance Work Orders & Approvals**:
     - Technicians: "Submit Completion Request" modal with hours worked, checklist, and spare parts consumed.
     - Managers: Dedicated **"Approval Queue"** tab with 1-click approve/reject actions and stock deductions.
   - **Schedules**: Recurring preventive maintenance calendar and interval tracker.
   - **Spare Parts Warehouse**: Stock levels with low-stock warnings and restock dialog.
   - **Timeline & Analytics**: Chronological plant event stream and breakdown frequency summary.
   - **Settings**: Apps Script Web App URL input, test connection, manual sync, and local backup JSON export (compatible with Qt desktop `timar_data.json`).

6. **Step 6: Verification & Compilation**:
   - Run `compile_applet` and verify zero TypeScript or build errors.
