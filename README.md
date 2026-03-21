# Staybook Server (Backend)

## TL;DR
- **What**: NestJS backend providing supplementary API services and background cron jobs for the Flutter `staybook` mobile app.
- **Core Integrations**: Firebase Admin SDK (Firestore) and PayOS (Payment Gateway).
- **Primary Roles**: Payment Link Generation, Webhook processing, and periodic background tasks (Cron Jobs).

---

## Tech Stack
- **Framework**: NestJS (TypeScript)
- **Database**: Firebase Admin SDK (interacts directly with the existing Firestore database used by the Flutter app)
- **Payment Gateway**: `@payos/node` v2
- **Task Scheduling**: `@nestjs/schedule`

---

## Environment Setup

Create a `.env` file in the root directory:

```env
# Firebase Admin Credentials (downloaded from Firebase Console)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your.iam.gserviceaccount.com"
# Note: Ensure the private key is properly formatted with newline characters
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# PayOS API Keys (from my.payos.vn)
PAYOS_CLIENT_ID="your-client-id"
PAYOS_API_KEY="your-api-key"
PAYOS_CHECKSUM_KEY="your-checksum-key"
```

---

## Key Features & Endpoints

### 1. PayOS Integration
The server acts as a secure intermediary for online payments via PayOS.

- **`POST /payment/create-payment-link`**:
  Receives `bookingId`, `amount`, `returnUrl`, and `cancelUrl` from the mobile app. Uses the PayOS SDK to generate a secure checkout link (`checkoutUrl`) and returns it to the app. Also logs the generated `orderCode` and `paymentLinkId` into the Firestore `bookings` document.
  
- **`POST /payment/payos-webhook`**:
  Listening endpoint for PayOS Webhooks. When a user successfully transfers money, PayOS triggers this endpoint. The server verifies the checksum signature using `verifyPaymentWebhookData()` to ensure authenticity, then automatically updates the booking status in Firestore to `paid`.

### 2. Cron Jobs (Background Tasks)
The server runs automated maintenance tasks on the Firestore database using `@nestjs/schedule`.

- **`cancelCheckinOverdueBookings` (Runs every minute)**:
  Scans for `pending` or `confirmed` bookings where the `checkIn` time has already passed. If the user failed to check-in or pay, the booking is automatically marked as `cancelled`.
  
- **`cancelExpiredBookings` (Runs every minute)**:
  Scans for unpaid bookings (`pending`) that were created more than 24 hours ago. Automatically marks them as `cancelled` to free up the room for other guests.

---

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Build for production
npm run build
npm run start:prod
```

## Deployment Notes
- **Webhook Configuration**: When deploying (e.g., to Render, Heroku, AWS), ensure you copy your public domain and configure it in your PayOS Merchant Dashboard under API Settings -> Webhook URL (e.g., `https://your-domain.com/payment/payos-webhook`).
- **Timezones**: Cron jobs run based on the server's local timezone. Configure your host's timezone to `Asia/Ho_Chi_Minh` for consistent booking execution if necessary.
