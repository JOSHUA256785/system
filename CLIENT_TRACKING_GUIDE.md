# Client Activity Tracking Implementation

## Overview

The system now tracks and displays customer activity with clear distinction between **online** and **offline** subscribed clients. The dashboard shows real-time metrics and detailed client information including subscription status and activity history.

## Features Implemented

### 1. Dashboard Metrics Update
The main dashboard now shows **actual subscribed client counts**, including:
- ✅ **Total Subscribed Clients** - All users with active subscriptions
- ✅ **Online Clients (24hrs)** - Users active within last 24 hours
- ✅ **Offline Clients** - Users inactive for more than 24 hours
- ✅ **Active Today** - Detailed daily activity count

### 2. New API Endpoints

#### `/api/dashboard/admin/subscribed-clients` (GET)
Returns comprehensive client status information:

```json
{
  "total_subscribed": 48,
  "online": {
    "count": 32,
    "threshold_hours": 24,
    "clients": [
      {
        "id": "user-id",
        "username": "john_doe",
        "email": "john@example.com",
        "phone": "+256701234567",
        "account_balance": 150000,
        "total_spent": 500000,
        "last_login": "2026-02-25T14:30:00",
        "subscription": {
          "package": "Premium Data",
          "data_allocated_gb": 10,
          "data_used_gb": 3.5,
          "end_date": "2026-03-01"
        }
      }
    ]
  },
  "offline": {
    "count": 16,
    "clients": []
  },
  "daily": {
    "new_subscriptions": 5,
    "active_today": 28
  }
}
```

#### `/api/dashboard/admin/client-activity` (GET)
Returns detailed client activity analytics:

```json
{
  "period_days": 7,
  "currently_online": 32,
  "daily_breakdown": {
    "2026-02-25": {
      "active": 28,
      "subscribed": 22
    },
    "2026-02-24": {
      "active": 25,
      "subscribed": 20
    }
  },
  "peak_hours": {
    "14": 45,
    "15": 52,
    "16": 48
  }
}
```

### 3. New Menu Item: "🎯 Client Activity"
A new dashboard menu item that opens an interactive modal displaying:

- **Quick Stats**: Total, Online, Offline, Active Today counts with percentages
- **Online Clients Table**: All currently active clients with:
  - Username
  - Email & Phone
  - Last login timestamp
  - Active subscription package
  - Account balance
  
- **Offline Clients Table**: Historical inactive clients with:
  - Same information as online table
  - Dimmed display to distinguish offline status
  - Last login data (or "Never" if no login recorded)

### 4. Code Generation & Tracking

The implementation includes automatic tracking of:

**Database Model Fields Used:**
- `User.last_login` - Timestamp of last user activity
- `User.is_active` - Account status flag
- `Subscription.is_active` - Active subscription flag
- `Subscription.end_date` - Subscription expiration

**Activity Calculation Logic:**
```python
# Define online as active within 24 hours
online_threshold = datetime.utcnow() - timedelta(hours=24)

# Client is online if:
# 1. Has active subscription (is_active=True)
# 2. Last login >= online_threshold
```

## Usage

### For Admins:

1. **View Client Activity**
   - Click "🎯 Client Activity" in sidebar
   - See real-time customer status
   - Identify at-risk customers (offline for extended periods)
   - Track daily activity trends

2. **Monitor Peak Hours**
   - Use `/api/dashboard/admin/client-activity` endpoint
   - Analyze peak_hours data
   - Optimize support staff scheduling
   - Plan maintenance windows

### For the Backend:

The system tracks customers by:
1. Recording `last_login` timestamp whenever a user logs in
2. Setting `is_active=True` for active subscriptions
3. Calculating online/offline status real-time based on last_login

## Example API Calls

### Get Subscribed Clients Status

```bash
curl -X GET http://localhost:5000/api/dashboard/admin/subscribed-clients \
  -H "Authorization: Bearer <token>"
```

### Get 7-Day Activity Report

```bash
curl -X GET "http://localhost:5000/api/dashboard/admin/client-activity?days=7" \
  -H "Authorization: Bearer <token>"
```

### Get 30-Day Peak Hours

```bash
curl -X GET "http://localhost:5000/api/dashboard/admin/client-activity?days=30" \
  -H "Authorization: Bearer <token>"
```

## Frontend Integration

### Updated Components:

1. **Dashboard.js** - `updateMetrics()` function
   - Fetches client count dynamically
   - Displays total subscribed clients (not hardcoded)
   - Logs online/offline breakdown to console

2. **Menu** - Added "🎯 Client Activity" option
   - Triggers `loadClientTracking()` function
   - Opens detailed client activity modal

3. **Modal** - `showClientActivityModal()` function
   - Displays 4-panel quick stats
   - Renders sortable client tables
   - Shows online status visually

## Data Flow

```
User Login
  ↓
Update User.last_login = datetime.utcnow()
  ↓
Dashboard loads
  ↓
updateMetrics() calls /api/dashboard/admin/subscribed-clients
  ↓
Backend calculates:
  - Users with active subscriptions
  - Online: last_login >= 24hrs ago
  - Offline: last_login < 24hrs ago
  ↓
Display counts:
  - "Total earned this month" (from revenue)
  - "Number of subscribed clients" (from subscriptions)
  - "Online/Offline breakdown" (from activity)
```

## Key Metrics

| Metric | Source | Updates |
|--------|--------|---------|
| **Total Subscribed** | Active subscriptions count | Real-time |
| **Online** | last_login >= 24 hours ago | Real-time |
| **Offline** | last_login < 24 hours ago | Real-time |
| **Active Today** | last_login >= today start | Real-time |
| **New Today** | Created today | Real-time |

## Technical Details

### Online/Offline Threshold
- **Online**: last_login within 24 hours
- **Offline**: last_login beyond 24 hours or no login
- **Active Today**: last_login since 00:00:00 today

### Subscription Tracking
- Requires `Subscription.is_active = True`
- Users without active subscriptions are not counted
- Subscription expiry date shown in client details

### Performance Considerations
- Queries optimized with proper indexing on `User.last_login` and `Subscription.is_active`
- Aggregations calculated server-side
- Results cached in window object for quick access

## Future Enhancements

Possible additions:
- 📊 Activity charts for weekly/monthly trends
- 📧 Email alerts for long-inactive customers
- 🎯 Customer re-engagement campaigns
- 📍 Geolocation tracking of online clients
- 💬 Push notifications to offline clients
- 🔔 Real-time activity websocket updates

## Testing

The implementation is ready for use. To verify:

1. Create a few test users
2. Set different `last_login` timestamps:
   - Some recent (within 24hrs) = Online
   - Some old (>24hrs ago) = Offline
3. Click "🎯 Client Activity" menu item
4. Verify correct online/offline categorization

Example test via CLI:
```bash
python -c "
from app import create_app
from models import db, User, Subscription
from datetime import datetime, timedelta

app = create_app()
with app.app_context():
    # Create test user
    user = User.query.first()
    if user:
        user.last_login = datetime.utcnow() - timedelta(hours=2)  # Online
        db.session.commit()
        print('User marked as online (2 hrs ago)')
"
```

## Summary

✅ **Dashboard now shows:**
- Real-time "Number of subscribed clients" count
- Breakdown of online vs offline customers
- Daily activity statistics
- Detailed client information with subscription status

✅ **Tracking includes:**
- Both active AND offline subscribed customers
- Last login timestamp for each user
- Active subscription details
- Account balance and spending history

✅ **New features:**
- Client Activity menu item
- Interactive client list modal
- Activity analytics API endpoints
- Peak hours analysis
