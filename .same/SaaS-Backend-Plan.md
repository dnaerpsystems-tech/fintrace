# FinTrace SaaS Backend & SuperAdmin Plan

> **Version:** 1.0
> **Last Updated:** February 7, 2026
> **Status:** Awaiting Approval

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Architecture](#-architecture)
4. [Database Schema](#-database-schema)
5. [Subscription Plans](#-subscription-plans)
6. [API Architecture](#-api-architecture)
7. [SuperAdmin Panel Features](#-superadmin-panel-features)
8. [Security Implementation](#-security-implementation)
9. [Development Phases](#-development-phases)
10. [Phase-wise Todo List](#-phase-wise-todo-list)

---

## 🎯 Project Overview

### SaaS Identity

| Attribute | Value |
|-----------|-------|
| **Product Name** | FinTrace SaaS |
| **Type** | Multi-tenant SaaS Platform |
| **Primary Market** | India (INR, UPI) |
| **Secondary Market** | Global (Stripe) |
| **Auth Method** | JWT + CSRF Cookie (HttpOnly) |
| **Admin Auth** | Separate SuperAdmin credentials |
| **Multi-tenancy** | Row-level isolation |

### Core Value Propositions

1. **Multi-Tenant Architecture** - Isolated user data with shared infrastructure
2. **Flexible Subscriptions** - Monthly, Quarterly, Half-Yearly, Yearly plans
3. **Family Plans** - Multiple members under one subscription
4. **Dual Payment Gateway** - Stripe (International) + Razorpay/UPI (India)
5. **SuperAdmin Control** - Full platform management and analytics
6. **Enterprise Ready** - Audit logs, compliance, data export

---

## 🛠️ Tech Stack

### Backend API

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime |
| Fastify | 5.x | API Framework (2x faster than Express) |
| TypeScript | 5.x | Type Safety |
| PostgreSQL | 16.x | Primary Database |
| Prisma | 5.x | ORM with migrations |
| Redis | 7.x | Sessions, Caching, Rate Limiting |
| BullMQ | 5.x | Background Jobs |
| Zod | 3.x | Schema Validation |
| Pino | 9.x | Structured Logging |
| Argon2 | - | Password Hashing |
| jose | - | JWT Signing/Verification |

### Payment Integrations

| Provider | Purpose | Markets |
|----------|---------|---------|
| Stripe | Cards, Wallets | Global |
| Razorpay | UPI, Cards, NetBanking | India |
| Cashfree | UPI Autopay (Subscriptions) | India |

### SuperAdmin Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Component Library |
| TanStack Query | 5.x | Server State |
| TanStack Table | 8.x | Data Tables |
| Recharts | 2.x | Admin Charts |
| React Router | 6.x | Navigation |
| Zustand | 4.x | State Management |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Local Development |
| Railway / Render | Backend Hosting |
| Vercel | Admin Panel Hosting |
| Cloudflare | CDN, DDoS Protection |
| Resend | Transactional Emails |
| AWS S3 / R2 | File Storage |

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                            │
│                     (Cloudflare / Nginx)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   FinTrace      │ │   FinTrace      │ │   SuperAdmin    │
│   PWA           │ │   API           │ │   Panel         │
│   (Client)      │ │   (Fastify)     │ │   (React)       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL    │ │     Redis       │ │    BullMQ       │
│   (Primary DB)  │ │   (Cache/Sessions) │ │   (Job Queue)  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     Stripe      │ │    Razorpay     │ │     Resend      │
│   (Payments)    │ │   (UPI/India)   │ │    (Emails)     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Multi-Tenant Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         REQUEST FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Request → Rate Limiter → CSRF Validation → JWT Verify      │
│                                                                 │
│  2. Extract user_id from JWT                                    │
│                                                                 │
│  3. All queries include WHERE user_id = :user_id                │
│     (Row-level tenant isolation via Prisma middleware)          │
│                                                                 │
│  4. Response with user-specific data only                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   super_admins   │     │      users       │────<│   subscriptions  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                │                         │
                                │                         ▼
                                ▼                 ┌──────────────────┐
                         ┌──────────────┐         │  subscription_   │
                         │   families   │────────>│     plans        │
                         └──────────────┘         └──────────────────┘
                                │                         │
                                ▼                         ▼
                         ┌──────────────┐         ┌──────────────────┐
                         │family_members│         │     payments     │
                         └──────────────┘         └──────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   accounts   │     │   transactions   │     │     budgets      │
└──────────────┘     └──────────────────┘     └──────────────────┘
```

### Complete Prisma Schema

```prisma
// =============================================
// ENUMS
// =============================================

enum UserRole {
  USER
  FAMILY_ADMIN
  FAMILY_MEMBER
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  DELETED
  PENDING_VERIFICATION
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  EXPIRED
  PAST_DUE
  TRIALING
  PAUSED
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
  CANCELLED
}

enum PaymentProvider {
  STRIPE
  RAZORPAY
  CASHFREE
  MANUAL
}

enum BillingCycle {
  MONTHLY
  QUARTERLY
  HALF_YEARLY
  YEARLY
}

enum AdminRole {
  SUPER_ADMIN
  ADMIN
  SUPPORT
  ANALYST
}

// =============================================
// SUPER ADMIN (Separate from Users)
// =============================================

model SuperAdmin {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  name          String
  role          AdminRole @default(ADMIN)

  isActive      Boolean   @default(true) @map("is_active")
  lastLoginAt   DateTime? @map("last_login_at")
  lastLoginIp   String?   @map("last_login_ip")

  // Two-Factor Auth
  twoFactorEnabled Boolean  @default(false) @map("two_factor_enabled")
  twoFactorSecret  String?  @map("two_factor_secret")

  // Permissions (JSON for flexibility)
  permissions   Json      @default("{}")

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  auditLogs     AdminAuditLog[]

  @@map("super_admins")
}

model AdminAuditLog {
  id          String   @id @default(uuid())
  adminId     String   @map("admin_id")

  action      String   // e.g., "user.suspend", "plan.update"
  entityType  String?  @map("entity_type")
  entityId    String?  @map("entity_id")

  oldValues   Json?    @map("old_values")
  newValues   Json?    @map("new_values")

  ipAddress   String?  @map("ip_address")
  userAgent   String?  @map("user_agent")

  createdAt   DateTime @default(now()) @map("created_at")

  admin       SuperAdmin @relation(fields: [adminId], references: [id])

  @@index([adminId])
  @@index([action])
  @@index([createdAt])
  @@map("admin_audit_logs")
}

// =============================================
// SUBSCRIPTION PLANS (Configured by Admin)
// =============================================

model SubscriptionPlan {
  id              String       @id @default(uuid())

  name            String       // "Basic", "Pro", "Family"
  slug            String       @unique // "basic", "pro", "family"
  description     String?

  // Pricing (stored in paise/cents)
  priceMonthly    Int          @map("price_monthly")
  priceQuarterly  Int          @map("price_quarterly")
  priceHalfYearly Int          @map("price_half_yearly")
  priceYearly     Int          @map("price_yearly")

  currency        String       @default("INR")

  // Features & Limits
  maxFamilyMembers    Int      @default(1) @map("max_family_members")
  maxAccounts         Int      @default(5) @map("max_accounts")
  maxTransactionsMonth Int?    @map("max_transactions_month") // null = unlimited
  maxBudgets          Int      @default(5) @map("max_budgets")
  maxGoals            Int      @default(3) @map("max_goals")
  maxLoans            Int      @default(2) @map("max_loans")

  // Feature Flags
  bankSyncEnabled     Boolean  @default(false) @map("bank_sync_enabled")
  aiInsightsEnabled   Boolean  @default(false) @map("ai_insights_enabled")
  voiceEntryEnabled   Boolean  @default(false) @map("voice_entry_enabled")
  receiptScanEnabled  Boolean  @default(false) @map("receipt_scan_enabled")
  exportEnabled       Boolean  @default(true) @map("export_enabled")
  apiAccessEnabled    Boolean  @default(false) @map("api_access_enabled")
  prioritySupport     Boolean  @default(false) @map("priority_support")

  // Stripe/Razorpay Product IDs
  stripeProductId     String?  @map("stripe_product_id")
  stripePriceIds      Json?    @map("stripe_price_ids") // {monthly: "price_xxx", yearly: "price_yyy"}
  razorpayPlanIds     Json?    @map("razorpay_plan_ids")

  // Status
  isActive            Boolean  @default(true) @map("is_active")
  isPopular           Boolean  @default(false) @map("is_popular")
  sortOrder           Int      @default(0) @map("sort_order")

  // Trial
  trialDays           Int      @default(14) @map("trial_days")

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  // Relations
  subscriptions       Subscription[]

  @@map("subscription_plans")
}

// =============================================
// USERS
// =============================================

model User {
  id              String       @id @default(uuid())

  email           String       @unique
  passwordHash    String       @map("password_hash")

  name            String
  phone           String?
  avatarUrl       String?      @map("avatar_url")

  role            UserRole     @default(USER)
  status          UserStatus   @default(PENDING_VERIFICATION)

  // Preferences (JSONB)
  preferences     Json         @default("{\"currency\": \"INR\", \"locale\": \"en-IN\", \"theme\": \"system\"}")

  // Verification
  emailVerifiedAt DateTime?    @map("email_verified_at")
  phoneVerifiedAt DateTime?    @map("phone_verified_at")

  // Security
  pinHash         String?      @map("pin_hash")
  biometricKey    String?      @map("biometric_key")
  failedAttempts  Int          @default(0) @map("failed_attempts")
  lockedUntil     DateTime?    @map("locked_until")

  // Tracking
  lastLoginAt     DateTime?    @map("last_login_at")
  lastActiveAt    DateTime?    @map("last_active_at")
  lastSyncAt      DateTime?    @map("last_sync_at")

  // Referral
  referralCode    String?      @unique @map("referral_code")
  referredBy      String?      @map("referred_by")

  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")
  deletedAt       DateTime?    @map("deleted_at")

  // Relations
  subscription    Subscription?
  familyOwned     Family?      @relation("FamilyOwner")
  familyMembership FamilyMember?
  refreshTokens   RefreshToken[]
  accounts        Account[]
  transactions    Transaction[]
  categories      Category[]
  budgets         Budget[]
  goals           Goal[]
  loans           Loan[]
  investments     Investment[]
  notifications   Notification[]

  @@index([email])
  @@index([status])
  @@index([createdAt])
  @@map("users")
}

model RefreshToken {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")

  tokenHash   String   @map("token_hash")
  deviceInfo  Json?    @map("device_info")

  expiresAt   DateTime @map("expires_at")
  revokedAt   DateTime? @map("revoked_at")

  createdAt   DateTime @default(now()) @map("created_at")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@map("refresh_tokens")
}

// =============================================
// SUBSCRIPTIONS
// =============================================

model Subscription {
  id              String             @id @default(uuid())
  userId          String             @unique @map("user_id")
  planId          String             @map("plan_id")

  status          SubscriptionStatus @default(TRIALING)
  billingCycle    BillingCycle       @default(MONTHLY)

  // Pricing at time of subscription
  priceAmount     Int                @map("price_amount")
  currency        String             @default("INR")

  // Dates
  trialEndsAt     DateTime?          @map("trial_ends_at")
  currentPeriodStart DateTime        @map("current_period_start")
  currentPeriodEnd   DateTime        @map("current_period_end")
  cancelledAt     DateTime?          @map("cancelled_at")

  // Payment Provider
  provider        PaymentProvider    @default(RAZORPAY)

  // External IDs
  stripeSubscriptionId  String?      @map("stripe_subscription_id")
  stripeCustomerId      String?      @map("stripe_customer_id")
  razorpaySubscriptionId String?     @map("razorpay_subscription_id")
  razorpayCustomerId    String?      @map("razorpay_customer_id")

  // Auto-renewal
  autoRenew       Boolean            @default(true) @map("auto_renew")

  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")

  // Relations
  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan            SubscriptionPlan   @relation(fields: [planId], references: [id])
  payments        Payment[]

  @@index([userId])
  @@index([status])
  @@index([currentPeriodEnd])
  @@map("subscriptions")
}

model Payment {
  id              String         @id @default(uuid())
  subscriptionId  String         @map("subscription_id")

  amount          Int            // in paise/cents
  currency        String         @default("INR")

  status          PaymentStatus  @default(PENDING)
  provider        PaymentProvider

  // Provider References
  stripePaymentId   String?      @map("stripe_payment_id")
  razorpayPaymentId String?      @map("razorpay_payment_id")
  razorpayOrderId   String?      @map("razorpay_order_id")

  // UPI Specific
  upiTransactionId  String?      @map("upi_transaction_id")

  // Invoice
  invoiceNumber   String?        @map("invoice_number")
  invoiceUrl      String?        @map("invoice_url")

  // Tax
  taxAmount       Int            @default(0) @map("tax_amount")
  taxPercentage   Decimal?       @map("tax_percentage") @db.Decimal(5, 2)

  // Failure Info
  failureReason   String?        @map("failure_reason")

  // Refund
  refundedAmount  Int            @default(0) @map("refunded_amount")
  refundedAt      DateTime?      @map("refunded_at")

  paidAt          DateTime?      @map("paid_at")
  createdAt       DateTime       @default(now()) @map("created_at")

  subscription    Subscription   @relation(fields: [subscriptionId], references: [id])

  @@index([subscriptionId])
  @@index([status])
  @@index([createdAt])
  @@map("payments")
}

// =============================================
// FAMILY (Multi-User under one subscription)
// =============================================

model Family {
  id          String   @id @default(uuid())
  ownerId     String   @unique @map("owner_id")

  name        String   @default("My Family")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  owner       User     @relation("FamilyOwner", fields: [ownerId], references: [id])
  members     FamilyMember[]

  @@map("families")
}

model FamilyMember {
  id          String   @id @default(uuid())
  familyId    String   @map("family_id")
  userId      String   @unique @map("user_id")

  role        String   @default("member") // "admin", "member", "child"

  // Permissions
  canViewAll  Boolean  @default(false) @map("can_view_all")
  canEditAll  Boolean  @default(false) @map("can_edit_all")

  // Spending Limits
  monthlyLimit Int?    @map("monthly_limit")

  joinedAt    DateTime @default(now()) @map("joined_at")

  family      Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([familyId])
  @@map("family_members")
}

model FamilyInvite {
  id          String   @id @default(uuid())
  familyId    String   @map("family_id")

  email       String
  token       String   @unique
  role        String   @default("member")

  expiresAt   DateTime @map("expires_at")
  acceptedAt  DateTime? @map("accepted_at")

  createdAt   DateTime @default(now()) @map("created_at")

  @@index([token])
  @@index([email])
  @@map("family_invites")
}

// =============================================
// APP CONFIGURATION (Admin Managed)
// =============================================

model AppConfig {
  id          String   @id @default(uuid())
  key         String   @unique
  value       Json
  description String?

  isPublic    Boolean  @default(false) @map("is_public")

  updatedAt   DateTime @updatedAt @map("updated_at")
  updatedBy   String?  @map("updated_by")

  @@map("app_configs")
}

model FeatureFlag {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?

  isEnabled   Boolean  @default(false) @map("is_enabled")

  // Rollout percentage (0-100)
  rolloutPercentage Int @default(0) @map("rollout_percentage")

  // Target specific plans
  targetPlans String[] @default([]) @map("target_plans")

  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("feature_flags")
}

// =============================================
// NOTIFICATIONS & EMAILS
// =============================================

model EmailTemplate {
  id          String   @id @default(uuid())
  name        String   @unique
  subject     String
  htmlBody    String   @map("html_body")
  textBody    String?  @map("text_body")

  variables   String[] @default([]) // ["userName", "planName", etc.]

  isActive    Boolean  @default(true) @map("is_active")

  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("email_templates")
}

model Notification {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")

  type        String   // "payment_success", "trial_ending", etc.
  title       String
  body        String?

  data        Json?    // Additional data for deep linking

  isRead      Boolean  @default(false) @map("is_read")
  readAt      DateTime? @map("read_at")

  createdAt   DateTime @default(now()) @map("created_at")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@map("notifications")
}

// =============================================
// ANALYTICS (Admin Dashboard)
// =============================================

model DailyStats {
  id          String   @id @default(uuid())
  date        DateTime @db.Date @unique

  // User Metrics
  newUsers    Int      @default(0) @map("new_users")
  activeUsers Int      @default(0) @map("active_users")
  churned     Int      @default(0)

  // Revenue (in paise)
  revenue     Int      @default(0)
  refunds     Int      @default(0)

  // Subscriptions
  newSubscriptions Int @default(0) @map("new_subscriptions")
  cancellations    Int @default(0)
  upgrades         Int @default(0)
  downgrades       Int @default(0)

  // Transactions (app usage)
  totalTransactions Int @default(0) @map("total_transactions")

  createdAt   DateTime @default(now()) @map("created_at")

  @@map("daily_stats")
}

// =============================================
// EXISTING APP ENTITIES (User-scoped)
// =============================================

model Account {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")

  name            String
  type            String   // savings, current, credit_card, cash, wallet
  bankName        String?  @map("bank_name")

  balance         Decimal  @default(0) @db.Decimal(15, 2)
  currency        String   @default("INR")
  creditLimit     Decimal? @map("credit_limit") @db.Decimal(15, 2)

  color           String   @default("#10B981")
  icon            String   @default("wallet")

  isActive        Boolean  @default(true) @map("is_active")
  isExcludedFromTotal Boolean @default(false) @map("is_excluded_from_total")
  sortOrder       Int      @default(0) @map("sort_order")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions    Transaction[]

  @@index([userId])
  @@map("accounts")
}

model Category {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id") // null for system defaults

  name        String
  type        String   // income, expense
  icon        String
  color       String

  parentId    String?  @map("parent_id")

  isSystem    Boolean  @default(false) @map("is_system")
  isActive    Boolean  @default(true) @map("is_active")
  sortOrder   Int      @default(0) @map("sort_order")

  keywords    String[] @default([])

  createdAt   DateTime @default(now()) @map("created_at")

  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  budgets     Budget[]

  @@index([userId])
  @@map("categories")
}

model Transaction {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  accountId       String   @map("account_id")
  categoryId      String?  @map("category_id")

  type            String   // income, expense, transfer
  amount          Decimal  @db.Decimal(15, 2)
  currency        String   @default("INR")

  description     String?
  note            String?

  date            DateTime @db.Date
  time            DateTime? @db.Time

  transferToAccountId String? @map("transfer_to_account_id")

  tags            String[] @default([])
  receiptUrls     String[] @default([]) @map("receipt_urls")
  location        Json?

  isRecurring     Boolean  @default(false) @map("is_recurring")
  recurringId     String?  @map("recurring_id")

  source          String   @default("manual")
  externalRef     String?  @map("external_ref")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  account         Account  @relation(fields: [accountId], references: [id])
  category        Category? @relation(fields: [categoryId], references: [id])

  @@index([userId])
  @@index([accountId])
  @@index([date])
  @@map("transactions")
}

model Budget {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  categoryId      String?  @map("category_id")

  name            String?
  amount          Decimal  @db.Decimal(15, 2)
  period          String   @default("monthly")

  alertThreshold  Int      @default(80) @map("alert_threshold")

  isActive        Boolean  @default(true) @map("is_active")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category        Category? @relation(fields: [categoryId], references: [id])

  @@index([userId])
  @@map("budgets")
}

model Goal {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")

  name            String
  description     String?
  icon            String   @default("target")
  color           String   @default("#10B981")

  targetAmount    Decimal  @map("target_amount") @db.Decimal(15, 2)
  currentAmount   Decimal  @default(0) @map("current_amount") @db.Decimal(15, 2)
  currency        String   @default("INR")

  targetDate      DateTime? @map("target_date")
  priority        String   @default("medium")

  isCompleted     Boolean  @default(false) @map("is_completed")
  completedAt     DateTime? @map("completed_at")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  contributions   GoalContribution[]

  @@index([userId])
  @@map("goals")
}

model GoalContribution {
  id          String   @id @default(uuid())
  goalId      String   @map("goal_id")

  amount      Decimal  @db.Decimal(15, 2)
  note        String?
  date        DateTime @default(now()) @db.Date

  createdAt   DateTime @default(now()) @map("created_at")

  goal        Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@index([goalId])
  @@map("goal_contributions")
}

model Loan {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")

  name            String
  type            String   // home, vehicle, personal, education
  lender          String

  principalAmount Decimal  @map("principal_amount") @db.Decimal(15, 2)
  interestRate    Decimal  @map("interest_rate") @db.Decimal(5, 2)
  tenureMonths    Int      @map("tenure_months")
  emiAmount       Decimal  @map("emi_amount") @db.Decimal(15, 2)

  startDate       DateTime @map("start_date")
  emiDay          Int      @map("emi_day")

  outstandingPrincipal Decimal? @map("outstanding_principal") @db.Decimal(15, 2)
  emisPaid        Int      @default(0) @map("emis_paid")

  status          String   @default("active")

  icon            String?
  color           String?

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("loans")
}

model Investment {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")

  name            String
  type            String   // mutual_fund, stocks, fd, ppf, nps, gold

  investedAmount  Decimal  @map("invested_amount") @db.Decimal(15, 2)
  currentValue    Decimal  @map("current_value") @db.Decimal(15, 2)

  units           Decimal? @db.Decimal(15, 4)
  purchasePrice   Decimal? @map("purchase_price") @db.Decimal(15, 2)
  currentPrice    Decimal? @map("current_price") @db.Decimal(15, 2)

  purchaseDate    DateTime? @map("purchase_date")
  maturityDate    DateTime? @map("maturity_date")

  taxSaving       Boolean  @default(false) @map("tax_saving")
  taxSection      String?  @map("tax_section")

  isActive        Boolean  @default(true) @map("is_active")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("investments")
}
```

---

## 💳 Subscription Plans

### Plan Structure

| Plan | Monthly | Quarterly | Half-Yearly | Yearly | Family Members |
|------|---------|-----------|-------------|--------|----------------|
| **Free** | ₹0 | - | - | - | 1 |
| **Basic** | ₹99 | ₹279 (₹93/mo) | ₹549 (₹91/mo) | ₹999 (₹83/mo) | 1 |
| **Pro** | ₹199 | ₹549 (₹183/mo) | ₹999 (₹166/mo) | ₹1,799 (₹150/mo) | 2 |
| **Family** | ₹349 | ₹949 (₹316/mo) | ₹1,799 (₹300/mo) | ₹2,999 (₹250/mo) | 5 |
| **Enterprise** | Custom | Custom | Custom | Custom | Unlimited |

### Feature Matrix

| Feature | Free | Basic | Pro | Family | Enterprise |
|---------|------|-------|-----|--------|------------|
| **Accounts** | 2 | 5 | 10 | 20 | Unlimited |
| **Transactions/month** | 50 | 500 | Unlimited | Unlimited | Unlimited |
| **Budgets** | 2 | 5 | 10 | 20 | Unlimited |
| **Goals** | 1 | 3 | 5 | 10 | Unlimited |
| **Loans** | 1 | 2 | 5 | 10 | Unlimited |
| **Bank CSV Import** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **AI Insights** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Voice Entry** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Receipt Scan (OCR)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Data Export** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Family Members** | 1 | 1 | 2 | 5 | Unlimited |

### Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PAYMENT FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User selects plan + billing cycle                          │
│                                                                 │
│  2. Detect payment method preference:                           │
│     - India: Show Razorpay (UPI, Cards, NetBanking)            │
│     - International: Show Stripe (Cards, Wallets)              │
│                                                                 │
│  3. Create order/payment intent                                 │
│                                                                 │
│  4. Redirect to payment gateway                                 │
│                                                                 │
│  5. Webhook receives payment confirmation                       │
│                                                                 │
│  6. Update subscription status                                  │
│                                                                 │
│  7. Send confirmation email + invoice                           │
│                                                                 │
│  8. Unlock premium features                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Subscription Lifecycle

```
Trial (14 days)
    │
    ├─ Upgrade → Active (Paid)
    │                │
    │                ├─ Auto-Renew → Continue Active
    │                │
    │                ├─ Payment Failed → Past Due (3 retry attempts)
    │                │                         │
    │                │                         └─ All failed → Expired
    │                │
    │                ├─ Cancel → Cancelled (access until period end)
    │                │                 │
    │                │                 └─ Period ends → Expired
    │                │
    │                └─ Downgrade → Effective next billing cycle
    │
    └─ No upgrade → Expired (Downgrade to Free)
```

---

## 🔌 API Architecture

### Base URL Structure

```
Production:  https://api.fintrace.app/v1
Admin API:   https://api.fintrace.app/admin/v1
Development: http://localhost:3001/v1
```

### Public API Endpoints

```
# Health
GET    /health                     - Health check
GET    /health/ready               - Readiness check

# Auth
POST   /auth/register              - Create account
POST   /auth/login                 - Login (returns JWT + sets CSRF cookie)
POST   /auth/logout                - Logout (invalidate tokens)
POST   /auth/refresh               - Refresh access token
POST   /auth/forgot-password       - Request password reset
POST   /auth/reset-password        - Reset with token
POST   /auth/verify-email          - Verify email
POST   /auth/resend-verification   - Resend verification email

# User
GET    /users/me                   - Get current user
PUT    /users/me                   - Update profile
PUT    /users/me/preferences       - Update preferences
DELETE /users/me                   - Delete account (soft delete)
POST   /users/me/avatar            - Upload avatar
PUT    /users/me/password          - Change password
POST   /users/me/pin               - Set/update app PIN

# Subscription
GET    /subscriptions/plans        - List available plans
GET    /subscriptions/current      - Get current subscription
POST   /subscriptions/checkout     - Create checkout session
POST   /subscriptions/change-plan  - Upgrade/downgrade
POST   /subscriptions/cancel       - Cancel subscription
POST   /subscriptions/resume       - Resume cancelled
GET    /subscriptions/invoices     - List invoices
GET    /subscriptions/usage        - Get usage stats

# Payment Webhooks
POST   /webhooks/stripe            - Stripe webhook
POST   /webhooks/razorpay          - Razorpay webhook

# Family
GET    /family                     - Get family details
POST   /family                     - Create family
POST   /family/invite              - Invite member
DELETE /family/members/:id         - Remove member
PUT    /family/members/:id         - Update member permissions
POST   /family/invites/:token/accept - Accept invite

# Data Sync
POST   /sync/push                  - Push local changes
GET    /sync/pull                  - Pull remote changes
GET    /sync/status                - Sync status

# App Data (All user-scoped)
# Accounts
GET    /accounts
POST   /accounts
GET    /accounts/:id
PUT    /accounts/:id
DELETE /accounts/:id
POST   /accounts/transfer

# Transactions
GET    /transactions
POST   /transactions
GET    /transactions/:id
PUT    /transactions/:id
DELETE /transactions/:id
POST   /transactions/bulk

# Categories
GET    /categories
POST   /categories
PUT    /categories/:id
DELETE /categories/:id

# Budgets
GET    /budgets
POST   /budgets
GET    /budgets/:id
PUT    /budgets/:id
DELETE /budgets/:id
GET    /budgets/summary

# Goals
GET    /goals
POST   /goals
GET    /goals/:id
PUT    /goals/:id
DELETE /goals/:id
POST   /goals/:id/contributions

# Loans
GET    /loans
POST   /loans
GET    /loans/:id
PUT    /loans/:id
DELETE /loans/:id
POST   /loans/:id/payments

# Investments
GET    /investments
POST   /investments
GET    /investments/:id
PUT    /investments/:id
DELETE /investments/:id

# Reports
GET    /reports/summary
GET    /reports/spending
GET    /reports/trends
GET    /reports/insights
```

### SuperAdmin API Endpoints

```
# Admin Auth (Separate from user auth)
POST   /admin/auth/login           - Admin login (2FA required)
POST   /admin/auth/logout          - Admin logout
POST   /admin/auth/verify-2fa      - Verify 2FA code

# Dashboard
GET    /admin/dashboard/stats      - Overview stats
GET    /admin/dashboard/revenue    - Revenue charts
GET    /admin/dashboard/users      - User growth charts
GET    /admin/dashboard/subscriptions - Subscription stats

# User Management
GET    /admin/users                - List users (paginated, filterable)
GET    /admin/users/:id            - Get user details
PUT    /admin/users/:id            - Update user
POST   /admin/users/:id/suspend    - Suspend user
POST   /admin/users/:id/unsuspend  - Unsuspend user
DELETE /admin/users/:id            - Delete user (soft)
GET    /admin/users/:id/activity   - User activity log
POST   /admin/users/:id/impersonate - Generate impersonation token

# Subscription Management
GET    /admin/subscriptions        - List all subscriptions
GET    /admin/subscriptions/:id    - Get subscription details
POST   /admin/subscriptions/:id/extend - Extend subscription
POST   /admin/subscriptions/:id/cancel - Force cancel
POST   /admin/subscriptions/:id/refund - Process refund

# Plan Management
GET    /admin/plans                - List plans
POST   /admin/plans                - Create plan
PUT    /admin/plans/:id            - Update plan
DELETE /admin/plans/:id            - Deactivate plan

# Payment Management
GET    /admin/payments             - List payments
GET    /admin/payments/:id         - Get payment details
POST   /admin/payments/:id/refund  - Process refund

# Configuration
GET    /admin/config               - Get all configs
PUT    /admin/config/:key          - Update config
GET    /admin/feature-flags        - List feature flags
PUT    /admin/feature-flags/:id    - Toggle feature flag

# Email Templates
GET    /admin/email-templates      - List templates
PUT    /admin/email-templates/:id  - Update template
POST   /admin/email-templates/test - Send test email

# Reports
GET    /admin/reports/revenue      - Revenue report
GET    /admin/reports/churn        - Churn analysis
GET    /admin/reports/ltv          - LTV report
GET    /admin/reports/cohort       - Cohort analysis
POST   /admin/reports/export       - Export report (CSV/Excel)

# Audit Logs
GET    /admin/audit-logs           - List audit logs

# Admin Management (Super Admin only)
GET    /admin/admins               - List admins
POST   /admin/admins               - Create admin
PUT    /admin/admins/:id           - Update admin
DELETE /admin/admins/:id           - Deactivate admin
```

---

## 👑 SuperAdmin Panel Features

### 1. Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  FinTrace Admin                                    👤 Admin Name │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ Users   │ │ Revenue │ │ Active  │ │ MRR     │              │
│  │ 12,450  │ │ ₹4.2L   │ │ Subs    │ │ ₹3.8L   │              │
│  │ +12%    │ │ +18%    │ │ 3,240   │ │ +15%    │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Revenue Chart                         │  │
│  │  📊 [Line chart showing daily/weekly/monthly revenue]    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────┐ ┌────────────────────────────────────┐ │
│  │ Plan Distribution  │ │ Recent Signups                     │ │
│  │ 🍩 [Donut chart]   │ │ - john@example.com (Pro)           │ │
│  │                    │ │ - jane@example.com (Family)        │ │
│  │ Free: 8,000        │ │ - ...                              │ │
│  │ Basic: 2,500       │ │                                    │ │
│  │ Pro: 1,500         │ │                                    │ │
│  │ Family: 450        │ │                                    │ │
│  └────────────────────┘ └────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. User Management

| Feature | Description |
|---------|-------------|
| **User List** | Paginated, searchable, filterable table |
| **Filters** | Status, Plan, Date range, Country |
| **Actions** | View, Edit, Suspend, Delete, Impersonate |
| **User Details** | Full profile, subscription, activity log |
| **Impersonation** | Login as user (for support) with audit log |

### 3. Subscription Management

| Feature | Description |
|---------|-------------|
| **Subscription List** | All subscriptions with status |
| **Filters** | Status, Plan, Provider, Billing cycle |
| **Actions** | Extend, Cancel, Refund, Change plan |
| **Revenue Analytics** | MRR, ARR, Churn rate, LTV |

### 4. Plan Configuration

| Setting | Description |
|---------|-------------|
| **Plan Editor** | Create/edit plans with pricing |
| **Feature Limits** | Set limits for each plan |
| **Pricing** | Monthly/Quarterly/Half-Yearly/Yearly |
| **Stripe/Razorpay IDs** | Link payment provider products |
| **Trial Duration** | Configure trial days |

### 5. Configuration Center

| Category | Settings |
|---------|----------|
| **General** | App name, logo, support email |
| **Authentication** | Session timeout, max sessions, 2FA requirement |
| **Payments** | Tax rate (GST), currency, payment providers |
| **Notifications** | Email settings, push notification config |
| **Feature Flags** | Enable/disable features, A/B testing |
| **Maintenance** | Maintenance mode toggle, custom message |

### 6. Reports & Analytics

| Report | Metrics |
|--------|---------|
| **Revenue** | Daily/Weekly/Monthly revenue, growth rate |
| **Subscriptions** | New, churned, upgraded, downgraded |
| **Users** | Signups, active users, retention |
| **Churn** | Churn rate, reasons, at-risk users |
| **LTV** | Customer lifetime value by cohort |
| **Geographic** | Users by country/region |

### 7. Audit Logs

| Field | Description |
|-------|-------------|
| **Admin** | Who performed the action |
| **Action** | What was done |
| **Entity** | What was affected |
| **Details** | Before/After values |
| **Timestamp** | When it happened |
| **IP Address** | From where |

---

## 🔐 Security Implementation

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER LOGIN FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. POST /auth/login {email, password}                         │
│                                                                 │
│  2. Validate credentials with Argon2                            │
│                                                                 │
│  3. Generate tokens:                                            │
│     - Access Token (JWT, 15 min expiry)                        │
│     - Refresh Token (UUID, 7 days expiry)                      │
│     - CSRF Token (random string)                               │
│                                                                 │
│  4. Store Refresh Token hash in DB                             │
│                                                                 │
│  5. Response:                                                   │
│     - Body: { accessToken, csrfToken, user }                   │
│     - Cookie: refreshToken (HttpOnly, Secure, SameSite=Strict) │
│     - Cookie: csrfToken (Secure, SameSite=Strict)              │
│                                                                 │
│  6. Client stores accessToken in memory (NOT localStorage)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    API REQUEST FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Request with:                                               │
│     - Header: Authorization: Bearer <accessToken>              │
│     - Header: X-CSRF-Token: <csrfToken>                        │
│     - Cookie: refreshToken (auto-sent)                         │
│                                                                 │
│  2. Verify JWT signature and expiry                            │
│                                                                 │
│  3. Validate CSRF token matches cookie                         │
│                                                                 │
│  4. Extract user_id from JWT payload                           │
│                                                                 │
│  5. All DB queries scoped to user_id                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Access token expired (401 response)                        │
│                                                                 │
│  2. Client calls POST /auth/refresh                            │
│     - Cookie: refreshToken (HttpOnly)                          │
│                                                                 │
│  3. Validate refresh token in DB                               │
│                                                                 │
│  4. Generate new access token + new refresh token              │
│     (Refresh token rotation for security)                      │
│                                                                 │
│  5. Return new tokens                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Security Measures

| Layer | Implementation |
|-------|----------------|
| **Password** | Argon2id hashing (memory-hard) |
| **JWT** | ES256 (ECDSA) signing, 15 min expiry |
| **CSRF** | Double-submit cookie pattern |
| **Rate Limiting** | Redis-based, per-IP and per-user |
| **Brute Force** | Account lockout after 5 failed attempts |
| **Sessions** | Plan-based: Free=2, Basic=3, Pro=5, Family=10 |
| **Admin 2FA** | TOTP required for all admin actions |
| **Audit Log** | All admin actions logged |
| **Encryption** | TLS 1.3, sensitive data encrypted at rest |

### Admin Authentication

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN LOGIN FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. POST /admin/auth/login {email, password}                   │
│                                                                 │
│  2. Validate admin credentials                                  │
│                                                                 │
│  3. Return: { requires2FA: true, tempToken }                   │
│                                                                 │
│  4. POST /admin/auth/verify-2fa {tempToken, code}              │
│                                                                 │
│  5. Validate TOTP code                                          │
│                                                                 │
│  6. Return: { accessToken, csrfToken, admin }                  │
│     + HttpOnly cookies                                          │
│                                                                 │
│  7. All admin actions logged to audit_logs                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Development Phases

### Phase Overview

| Phase | Name | Duration | Priority |
|-------|------|----------|----------|
| **B1** | Backend Foundation | 2-3 days | Critical |
| **B2** | User Authentication | 2 days | Critical |
| **B3** | Subscription & Payments | 3-4 days | Critical |
| **B4** | Core API Endpoints | 2-3 days | Critical |
| **B5** | Data Sync | 2 days | High |
| **B6** | Family Features | 1-2 days | High |
| **A1** | Admin Panel Foundation | 2 days | Critical |
| **A2** | Admin Dashboard | 2 days | Critical |
| **A3** | User Management | 2 days | Critical |
| **A4** | Subscription Management | 2 days | High |
| **A5** | Configuration Center | 1-2 days | High |
| **A6** | Reports & Analytics | 2 days | High |
| **I1** | Integration & Testing | 2-3 days | Critical |
| **I2** | Deployment | 1-2 days | Critical |

**Total Estimated Duration: 25-35 days**

---

## ✅ Phase-wise Todo List

### Phase B1: Backend Foundation (2-3 days)

```markdown
## B1.1 Project Setup
- [ ] Initialize Node.js project with TypeScript
- [ ] Configure Fastify with plugins
- [ ] Set up folder structure (routes, services, controllers, middlewares)
- [ ] Configure ESLint + Prettier
- [ ] Set up environment variables (.env)
- [ ] Configure Pino logging

## B1.2 Database Setup
- [ ] Set up PostgreSQL (local Docker or Railway)
- [ ] Initialize Prisma with schema
- [ ] Create initial migrations
- [ ] Set up database seeding (plans, categories)
- [ ] Configure connection pooling

## B1.3 Redis Setup
- [ ] Set up Redis (local Docker or Railway)
- [ ] Create Redis client wrapper
- [ ] Implement session store
- [ ] Set up rate limiter (Redis-based)

## B1.4 Core Infrastructure
- [ ] Create base response format
- [ ] Implement error handling middleware
- [ ] Create request validation (Zod)
- [ ] Set up CORS configuration
- [ ] Implement health check endpoints
```

### Phase B2: User Authentication (2 days)

```markdown
## B2.1 Registration & Login
- [ ] POST /auth/register - Email validation, Argon2 hashing
- [ ] POST /auth/login - Credential validation, JWT generation
- [ ] POST /auth/logout - Token invalidation
- [ ] POST /auth/refresh - Refresh token rotation
- [ ] Implement CSRF token generation

## B2.2 Email Verification
- [ ] POST /auth/verify-email - Token validation
- [ ] POST /auth/resend-verification
- [ ] Email service integration (Resend)
- [ ] Create email templates

## B2.3 Password Management
- [ ] POST /auth/forgot-password
- [ ] POST /auth/reset-password
- [ ] PUT /users/me/password - Change password

## B2.4 Security Middleware
- [ ] JWT verification middleware
- [ ] CSRF validation middleware
- [ ] Rate limiting middleware
- [ ] Account lockout implementation
- [ ] Session management (max 5 devices)
```

### Phase B3: Subscription & Payments (3-4 days)

```markdown
## B3.1 Plan Management
- [ ] Seed subscription plans in database
- [ ] GET /subscriptions/plans - List plans
- [ ] Plan feature checking service

## B3.2 Stripe Integration
- [ ] Configure Stripe SDK
- [ ] Create Stripe products/prices
- [ ] POST /subscriptions/checkout - Create checkout session
- [ ] Implement Stripe webhook handler
- [ ] Handle subscription lifecycle events

## B3.3 Razorpay Integration
- [ ] Configure Razorpay SDK
- [ ] Create Razorpay plans
- [ ] Create Razorpay subscription
- [ ] Implement Razorpay webhook handler
- [ ] Handle UPI autopay

## B3.4 Subscription Management
- [ ] GET /subscriptions/current
- [ ] POST /subscriptions/change-plan
- [ ] POST /subscriptions/cancel
- [ ] POST /subscriptions/resume
- [ ] Subscription status cron job (check expired)

## B3.5 Invoice & Billing
- [ ] Generate invoice on payment
- [ ] GET /subscriptions/invoices
- [ ] Invoice PDF generation
- [ ] Send invoice emails
```

### Phase B4: Core API Endpoints (2-3 days)

```markdown
## B4.1 User Endpoints
- [ ] GET /users/me
- [ ] PUT /users/me
- [ ] PUT /users/me/preferences
- [ ] DELETE /users/me (soft delete)
- [ ] POST /users/me/avatar (file upload to S3)

## B4.2 Account Endpoints
- [ ] CRUD for /accounts
- [ ] POST /accounts/transfer
- [ ] Plan limit checking (max accounts)

## B4.3 Transaction Endpoints
- [ ] CRUD for /transactions
- [ ] POST /transactions/bulk
- [ ] Plan limit checking (max transactions/month)

## B4.4 Other Data Endpoints
- [ ] CRUD for /categories
- [ ] CRUD for /budgets
- [ ] CRUD for /goals + contributions
- [ ] CRUD for /loans
- [ ] CRUD for /investments

## B4.5 Reports Endpoints
- [ ] GET /reports/summary
- [ ] GET /reports/spending
- [ ] GET /reports/trends
- [ ] GET /reports/insights
```

### Phase B5: Data Sync (2 days)

```markdown
## B5.1 Sync Protocol
- [ ] Design sync conflict resolution strategy
- [ ] Create sync_queue table
- [ ] Implement change tracking

## B5.2 Sync Endpoints
- [ ] POST /sync/push - Push local changes
- [ ] GET /sync/pull - Pull remote changes (since timestamp)
- [ ] GET /sync/status - Last sync info
- [ ] Handle offline-first conflict resolution

## B5.3 Sync Optimization
- [ ] Delta sync (only changed records)
- [ ] Batch processing
- [ ] Compression for large payloads
```

### Phase B6: Family Features (1-2 days)

```markdown
## B6.1 Family Management
- [ ] POST /family - Create family
- [ ] GET /family - Get family details
- [ ] PUT /family - Update family

## B6.2 Member Management
- [ ] POST /family/invite - Send invite email
- [ ] POST /family/invites/:token/accept
- [ ] DELETE /family/members/:id
- [ ] PUT /family/members/:id (permissions)

## B6.3 Data Sharing
- [ ] Implement data visibility rules
- [ ] Shared budgets support
- [ ] Member spending limits
```

### Phase A1: Admin Panel Foundation (2 days)

```markdown
## A1.1 Project Setup
- [ ] Initialize React + Vite + TypeScript
- [ ] Configure Tailwind + shadcn/ui
- [ ] Set up folder structure
- [ ] Configure React Router
- [ ] Set up TanStack Query

## A1.2 Authentication
- [ ] Admin login page with 2FA
- [ ] Auth context and hooks
- [ ] Protected route wrapper
- [ ] CSRF token handling

## A1.3 Layout
- [ ] Sidebar navigation
- [ ] Header with admin profile
- [ ] Breadcrumb navigation
- [ ] Toast notifications
```

### Phase A2: Admin Dashboard (2 days)

```markdown
## A2.1 Stats Cards
- [ ] Total users card
- [ ] Revenue card (today/month)
- [ ] Active subscriptions card
- [ ] MRR/ARR card

## A2.2 Charts
- [ ] Revenue trend chart (line)
- [ ] User growth chart (area)
- [ ] Plan distribution chart (donut)
- [ ] Subscription status chart

## A2.3 Activity Feed
- [ ] Recent signups list
- [ ] Recent payments list
- [ ] Recent cancellations list
```

### Phase A3: User Management (2 days)

```markdown
## A3.1 User List
- [ ] Data table with TanStack Table
- [ ] Search functionality
- [ ] Filters (status, plan, date)
- [ ] Pagination
- [ ] Bulk actions

## A3.2 User Details
- [ ] User profile view
- [ ] Subscription details
- [ ] Activity timeline
- [ ] Usage stats

## A3.3 User Actions
- [ ] Edit user modal
- [ ] Suspend/unsuspend
- [ ] Delete user (with confirmation)
- [ ] Impersonation (with audit)
```

### Phase A4: Subscription Management (2 days)

```markdown
## A4.1 Subscription List
- [ ] Data table with filters
- [ ] Status badges
- [ ] Revenue column
- [ ] Actions column

## A4.2 Plan Editor
- [ ] Plan list view
- [ ] Create/Edit plan form
- [ ] Feature limit configuration
- [ ] Pricing configuration
- [ ] Stripe/Razorpay ID linking

## A4.3 Payment Management
- [ ] Payment history table
- [ ] Payment details modal
- [ ] Refund action
- [ ] Invoice download
```

### Phase A5: Configuration Center (1-2 days)

```markdown
## A5.1 App Settings
- [ ] General settings form
- [ ] Payment provider settings
- [ ] Email settings

## A5.2 Feature Flags
- [ ] Feature flag list
- [ ] Toggle switch
- [ ] Rollout percentage slider
- [ ] Target plans selector

## A5.3 Email Templates
- [ ] Template list
- [ ] Template editor (HTML preview)
- [ ] Variable insertion
- [ ] Test email sender
```

### Phase A6: Reports & Analytics (2 days)

```markdown
## A6.1 Revenue Reports
- [ ] Daily/Weekly/Monthly revenue
- [ ] Revenue by plan
- [ ] Revenue by payment method
- [ ] Export to CSV

## A6.2 User Reports
- [ ] User growth chart
- [ ] Churn analysis
- [ ] Retention cohort
- [ ] Geographic distribution

## A6.3 Audit Logs
- [ ] Audit log table
- [ ] Filters (admin, action, date)
- [ ] Log details modal
```

### Phase I1: Integration & Testing (2-3 days)

```markdown
## I1.1 PWA Integration
- [ ] Update PWA to use API
- [ ] Implement auth flow in PWA
- [ ] Subscription status checking
- [ ] Feature gating based on plan
- [ ] Sync integration

## I1.2 Testing
- [ ] Unit tests for services
- [ ] Integration tests for API
- [ ] E2E tests for critical flows
- [ ] Load testing

## I1.3 Security Audit
- [ ] OWASP checklist review
- [ ] Penetration testing
- [ ] Dependency vulnerability scan
```

### Phase I2: Deployment (1-2 days)

```markdown
## I2.1 Backend Deployment
- [ ] Docker configuration
- [ ] Railway/Render setup
- [ ] Environment variables
- [ ] Database migrations
- [ ] SSL configuration

## I2.2 Admin Panel Deployment
- [ ] Vercel deployment
- [ ] Environment variables
- [ ] Custom domain

## I2.3 Monitoring
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Log aggregation
- [ ] Alerting setup
```

---

## 📊 Summary

### What We're Building

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend API** | Fastify + PostgreSQL + Redis | Multi-tenant SaaS API |
| **SuperAdmin Panel** | React + shadcn/ui | Platform management |
| **Payment Gateway** | Stripe + Razorpay | Subscription billing |
| **Authentication** | JWT + CSRF Cookies | Secure auth flow |

### Key Decisions

| Decision | Reasoning |
|----------|-----------|
| **Fastify over Express** | 2x faster, better TypeScript, schema validation |
| **Prisma over TypeORM** | Better DX, type safety, migrations |
| **Razorpay for India** | Native UPI support, lower fees |
| **CSRF + HttpOnly Cookies** | Most secure auth for web apps |
| **Separate Admin Auth** | Security isolation, 2FA requirement |
| **Row-level tenancy** | Simpler than schema-per-tenant, good for scale |

---

## 🎯 Approval Checklist

Please review and confirm:

1. ✅ Tech stack approved? (Fastify, PostgreSQL, Prisma, Redis)
2. ✅ Subscription plans and pricing OK?
3. ✅ Feature matrix correct?
4. ✅ Payment providers (Stripe + Razorpay)?
5. ✅ SuperAdmin features complete?
6. ✅ Security approach (JWT + CSRF) approved?
7. ✅ Phase priorities correct?
8. ✅ Any additions/changes needed?

---

**Ready to proceed?** Once approved, I'll start with **Phase B1: Backend Foundation**.
