# CoreT Admin — Bank Verification & Management Board

> Dedicated Bank Officer Terminal & REST API Server for the **CoreT** Digital Banking Platform.

---

## 📱 Live Dual-Phone Flow (Citizen App + Admin Board)

When deployed, you can use CoreT from two phones simultaneously:

1. **Phone 1 (Citizen / User App - `CoreT`)**:
   - Opens the citizen banking portal (`https://coret-user.vercel.app` or similar).
   - Citizen fills Deposit slip, Cash Withdrawal slip, does Camera OCR scanning, or tests demo forms.
   - When submitted, the transaction is securely transmitted to the Admin Backend.

2. **Phone 2 (Admin Board - `CoreT-admin`)**:
   - Opens this Admin Board (`https://coret-admin.vercel.app`).
   - Requests appear automatically in real-time (polling every 3s).
   - Cashier / Branch Officer verifies the stamped physical slip canvas, account number, amount in words, and digital signature.
   - Cashier clicks **Approve** or **Reject** (with reason).
   - Citizen app immediately reflects the updated verification status!

---

## 🚀 One-Click Deploy to Vercel

1. Import this repository (`Akshatsoni99/CoreT-admin`) into [Vercel](https://vercel.com).
2. Framework Preset: **Vite**
3. Add Environment Variables (optional, defaults work out-of-the-box):
   - `ALLOWED_ORIGINS`: `*`
   - `GEMINI_API_KEY`: `your_gemini_api_key_here` (for RAAHA backend intelligence)
4. Deploy!

### Connecting Citizen App (`CoreT`) to this Admin Backend:
Once `CoreT-admin` is deployed on Vercel:
- In the Citizen App (`CoreT`), go to **Profile > Settings > CoreT-Admin Live Sync**.
- Paste your live `CoreT-admin` Vercel URL (e.g., `https://coret-admin.vercel.app`) and tap **Save**.
- Or set `VITE_API_BASE_URL=https://your-admin-app.vercel.app` in the Citizen App's Vercel Environment Variables.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run Frontend & Dev Server
npm run dev

# Run Standalone Express API Server (port 3001)
npm run server

# Build for production
npm run build
```

---

## 📡 REST API Endpoints

- `GET /api/requests` — Retrieve all requests with status/type/source filters
- `POST /api/requests` — Submit a new citizen bank slip or OCR verification
- `GET /api/requests/:id` — Retrieve a specific request by Verification ID
- `PATCH /api/requests/:id/status` — Approve or Reject a bank transaction
- `GET /api/requests/:id/status` — Public citizen verification status check
- `POST /api/requests/clean` — Wipe/clean the transaction queue
- `POST /api/requests/restore` — Restore fresh demo bank counter requests
- `GET /api/health` — Backend health check
