# Quick Start: Client Activity Tracking

## 1️⃣ View Client Activity

**Steps:**
1. Login as admin
2. Open the 🎯 Client Activity menu on the sidebar (it now has a dropdown)
3. Choose a page:
   - Overview (all stats)
   - ⭐ Active Users
   - 🟢 Online Users
   - ⚫ Offline Users
4. See real-time client status

Expected to see:
- Total subscribed clients
- Online clients (🟢 green)
- Offline clients (⚫ gray)
- Active today count

(The overview page shows all of the above; the other pages focus on a single category.)

## 2️⃣ Understand the Metrics

*(Aside: the devices modal now shows detailed status for provisioned hardware. Each entry includes a vendor icon and an online/offline badge; the provisioned tab provides a vendor‑breakdown summary.)*

*When adding a brand new device you’ll also see a terminal-style communication log at the top of the form. It tracks vendor selection and the request/response flow during provisioning — handy for troubleshooting import/accept errors.*

## 2️⃣ Understand the Metrics

```
Dashboard shows:
┌─────────────────────────────────────┐
│ 💵 Total earned this month          │  ← Revenue (Vouchers + Mobile Money)
│ USH 5,000,000                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 👤 Number of subscribed clients     │  ← Active subscriptions with tracking
│ 48                                  │
│ 🟢 Online (24hrs): 38               │
│ ⚫ Offline: 10                       │
│ 📊 Active Today: 42                 │
└─────────────────────────────────────┘
```

## 3️⃣ How It Works

```
Customer Action
     ↓
User Logs In (Authentication)
     ↓
Update User.last_login = NOW()
     ↓
Dashboard Loads
     ↓
Calculate Online/Offline:
✅ Online = last_login within 24 hours 
❌ Offline = last_login > 24 hours ago
     ↓
Display Counts
     ↓
Admin sees client status
```

## 4️⃣ Data shown for each client

**Online Clients:**
- ✅ Username & Email
- ✅ Phone number
- ✅ Last login time
- ✅ Current subscription
- ✅ Account balance

**Offline Clients:**
- ℹ️ Same information
- ℹ️ Grayed out to show offline status
- ℹ️ "Never" if no login recorded

## 5️⃣ Example API Response

**Request:**
```bash
GET /api/dashboard/admin/subscribed-clients
```

**Response:**
```json
{
  "total_subscribed": 48,
  "online": {
    "count": 38,
    "threshold_hours": 24,
    "clients": [
      {
        "username": "john_doe",
        "email": "john@example.com",
        "phone": "+256701234567",
        "last_login": "2026-02-25T14:30:00",
        "account_balance": 150000,
        "subscription": {
          "package": "Premium Data",
          "data_allocated_gb": 10,
          "end_date": "2026-03-01T00:00:00"
        }
      }
    ]
  },
  "offline": {
    "count": 10,
    "clients": [...]
  },
  "daily": {
    "new_subscriptions": 5,
    "active_today": 42
  }
}
```

## 6️⃣ Key Features

| Feature | What It Does | Benefit |
|---------|-------------|---------|
| Online/Offline | Tracks user activity within 24hrs | Identify engaged customers |
| Daily Stats | Shows new subs & active users today | Monitor daily metrics |
| Client Details | Shows subscription & balance info | Full customer view |
| Activity Modal | Interactive table view | Easy management interface |
| Peak Hours | Identifies busy times | Resource planning |

## 7️⃣ Database Fields Used

**No new database changes!** Uses existing:

```
Users table:
  ├─ last_login (timestamp)          ← When user last logged in
  ├─ is_active (boolean)             ← Account status
  └─ account_balance (float)         ← Account balance

Subscriptions table:
  ├─ is_active (boolean)             ← Current subscription status
  └─ end_date (datetime)             ← When subscription expires
```

## 8️⃣ Testing

**Run test script:**
```bash
python test_client_tracking.py
```

**Expected output:**
```
✓ Total Subscribed: 4
✓ Online (24hrs): 2
✓ Offline: 2
✓ Active Today: 2
✓ All assertions passed!
```

## 9️⃣ Real-World Example

**Dashboard showing real data:**

```
Customer Activity Summary:
├─ Total Clients: 48
│  ├─ 🟢 Online: 38 (79%)
│  │  ├─ john_doe - Active 2hrs ago
│  │  ├─ jane_smith - Active 4hrs ago
│  │  └─ 36 more...
│  └─ ⚫ Offline: 10 (21%)
│     ├─ alice_jones - Inactive 2 days
│     ├─ bob_williams - Never logged in
│     └─ 8 more...
├─ Active Today: 42
└─ New Subscriptions: 5
```

## 🔟 Common Use Cases

**1. Find Inactive Customers:**
- Click "🎯 Client Activity"
- Look at "Offline" section
- Contact them for re-engagement

**2. Monitor Peak Hours:**
- Check `/api/dashboard/admin/client-activity?days=7`
- See peak_hours breakdown
- Plan support staff accordingly

**3. Track Daily Growth:**
- Check "daily.new_subscriptions"
- See "daily.active_today" count
- Monitor growth metrics

**4. Check Subscription Status:**
- Click on a client
- See "Package" and "end_date"
- Identify expiring subscriptions

## Summary

✅ **Dashboard Now Shows:**
- Total subscribed clients (dynamic, not hardcoded)
- Online customers (active within 24 hours)
- Offline customers (inactive 24+ hours)
- Daily activity statistics
- Detailed client information with subscriptions

✅ **Tracking Includes:**
- All subscribed customers (both online and offline)
- Last login timestamp for activity tracking
- Subscription status and expiry dates
- Account balance and spending history

✅ **Features Available:**
- Interactive client activity modal
- Online/offline visual distinction
- Peak hours analysis
- Daily metrics dashboard
- Full customer detail view

---

**Ready to track your customers! Click "🎯 Client Activity" to get started.**
