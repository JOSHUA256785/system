# Hotspot Billing System

A comprehensive Flask-based billing system for hotspot internet services. This system manages user subscriptions, data usage tracking, transactions, and provides detailed analytics dashboard.

## Features

✅ **User Management**
- User registration and authentication
- Profile management
- Account balance tracking
- User segmentation and analytics

✅ **Package Management**
- Create and manage internet packages
- Different package types (hourly, daily, weekly, monthly)
- Package performance tracking

✅ **Subscription Management**
- Purchase packages
- Renew subscriptions
- Cancel subscriptions
- Auto-renewal options

✅ **Billing System**
- Transaction tracking
- Account topup
- Refund processing
- Invoice generation
- Balance adjustments

✅ **Usage Tracking**
- Real-time data usage logging
- Daily/monthly usage summaries
- Usage trends and predictions
- Device-based usage breakdown

✅ **Dashboard & Analytics**
- User dashboard with overview
- Spending forecasts
- Admin dashboard with system statistics
- Revenue reports
- User analytics and segmentation
- Package performance metrics
- Top users tracking

## System Requirements

- Python 3.8+
- SQLite (default) or PostgreSQL
- pip (Python package manager)

## Installation

### 1. Clone or Download the Project

```bash
cd centi
```

### 2. Create a Virtual Environment (Recommended)

```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Initialize Database

```bash
# On Windows
python -m flask --app run init-db

# Or using the run.py script
python run.py
# Then in Flask shell: db.create_all()
```

### 5. Seed Sample Data

```bash
python -m flask --app run seed-data
python -m flask --app run create-test-user
```

This creates:
- Admin user: `admin` / `admin123`
- Test user: `testuser` / `test123` (with 50,000 USH balance)
- 8 sample packages matching the dashboard images

## Running the Application

```bash
python run.py
```

The API will be available at: `http://localhost:5000`

## Project Structure

```
centi/
├── run.py                 # Application startup script
├── app.py                 # Flask app factory
├── config.py              # Configuration settings
├── models.py              # Database models
├── requirements.txt       # Python dependencies
├── routes/                # API blueprints
│   ├── __init__.py
│   ├── auth.py            # Authentication endpoints
│   ├── packages.py        # Package management
│   ├── subscriptions.py   # Subscription management
│   ├── transactions.py    # Billing and transactions
│   ├── usage.py           # Usage tracking
│   ├── dashboard.py       # Analytics and reports
│   └── admin.py           # Admin management
├── hotspot_billing.db     # SQLite database (auto-created)
└── README.md              # This file
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/change-password` | Change password |

### Packages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/packages` | List active packages |
| GET | `/api/packages/<id>` | Get package details |
| GET | `/api/packages/recommendations` | Get recommendations for user |
| POST | `/api/packages` | Create package (Admin) |
| PUT | `/api/packages/<id>` | Update package (Admin) |
| DELETE | `/api/packages/<id>` | Delete package (Admin) |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions` | List user subscriptions |
| GET | `/api/subscriptions/<id>` | Get subscription details |
| GET | `/api/subscriptions/active` | Get active subscription |
| POST | `/api/subscriptions/purchase/<pkg_id>` | Purchase package |
| POST | `/api/subscriptions/<id>/renew` | Renew subscription |
| POST | `/api/subscriptions/<id>/cancel` | Cancel subscription |

### Transactions & Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List user transactions |
| GET | `/api/transactions/<id>` | Get transaction details |
| GET | `/api/transactions/summary` | Transaction summary |
| GET | `/api/transactions/filter` | Filter transactions |
| POST | `/api/transactions/topup` | Add account credit |
| POST | `/api/transactions/refund` | Request refund |

### Usage Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/usage/log` | Log data usage |
| GET | `/api/usage/current` | Get current usage stats |
| GET | `/api/usage/history` | Get usage history |
| GET | `/api/usage/daily-summary` | Get daily summary |
| GET | `/api/usage/device-summary` | Get device breakdown |
| GET | `/api/usage/trends` | Get usage trends & forecast |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/user/overview` | User dashboard overview |
| GET | `/api/dashboard/user/spending-forecast` | Spending forecast |
| GET | `/api/dashboard/admin/system-overview` | System overview (Admin) |
| GET | `/api/dashboard/admin/revenue-report` | Revenue report (Admin) |
| GET | `/api/dashboard/admin/user-analytics` | User analytics (Admin) |
| GET | `/api/dashboard/admin/top-users` | Top users (Admin) |
| GET | `/api/dashboard/admin/package-performance` | Package metrics (Admin) |

### Admin Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users (Admin) |
| GET | `/api/admin/users/<id>` | Get user details (Admin) |
| POST | `/api/admin/users/<id>/deactivate` | Deactivate user (Admin) |
| POST | `/api/admin/users/<id>/activate` | Activate user (Admin) |
| POST | `/api/admin/users/<id>/adjust-balance` | Adjust balance (Admin) |
| GET | `/api/admin/subscriptions` | List subscriptions (Admin) |
| POST | `/api/admin/activate-all` | Activate all users/packages/subscriptions (Admin helper) |
| GET | `/api/admin/transactions` | List transactions (Admin) |
| POST | `/api/admin/invoices/<user_id>` | Generate invoice (Admin) |
| GET | `/api/admin/system-stats` | System statistics (Admin) |
| POST | `/api/admin/promote-admin/<user_id>` | Promote to admin (Admin) |
| POST | `/api/admin/demote-admin/<user_id>` | Demote from admin (Admin) |

## Database Models

### User
- User account information
- Account balance and spending tracking
- Authentication credentials

### Package
- Internet package definitions
- Data allocation and validity period
- Pricing information

### Subscription
- User package subscriptions
- Data usage tracking
- Expiration management

### Transaction
- Billing transactions (purchases, topups, refunds)
- Payment method tracking
- Transaction status

### UsageLog
- Real-time data usage logging
- Session information
- Device tracking

### Invoice
- Invoice generation for subscriptions
- Payment status tracking
- Itemized billing

## Example Usage

### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "user@example.com",
    "phone": "+256700000001",
    "password": "secure123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "secure123"
  }'
```

### 3. View Available Packages
```bash
curl http://localhost:5000/api/packages
```

### 4. Topup Account Balance
```bash
curl -X POST http://localhost:5000/api/transactions/topup \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_ID" \
  -d '{
    "amount": 50000,
    "payment_method": "mobile_money"
  }'
```

### 5. Purchase a Package
```bash
curl -X POST http://localhost:5000/api/subscriptions/purchase/pkg-24hrs-unlimited \
  -H "Cookie: session=YOUR_SESSION_ID"
```

### 6. Log Data Usage
```bash
curl -X POST http://localhost:5000/api/usage/log \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_ID" \
  -d '{
    "data_used_mb": 500,
    "session_duration_minutes": 60,
    "device_type": "mobile"
  }'
```

## Sample Packages (Seeded)

| Package Name | Price (USH) | Data | Validity | Type |
|--------------|-------------|------|----------|------|
| 6HRS UNLIMITED | 500 | 100 GB | 1 day | Hourly |
| 24HRS UNLIMITED | 1,200 | 100 GB | 1 day | Daily |
| WELCOME | Free | 10 GB | 7 days | Weekly |
| 8 HRS UNLIMITED | 700 | 100 GB | 1 day | Hourly |
| 7DAYS UNLIMITED | 4,200 | 100 GB | 7 days | Weekly |
| 30DAYS UNLIMITED | 3,500 | 100 GB | 30 days | Monthly |
| 30DAYS VIP | 14,200 | 100 GB | 30 days | Monthly |
| 140DAYS VIP | 7,200 | 100 GB | 140 days | Long-term |

## Default Credentials

After seeding:
- **Admin**: `admin` / `admin123`
- **Test User**: `testuser` / `test123` (50,000 USH balance)

## Configuration

Edit `config.py` to customize:
- Database URI
- Secret keys
- Session settings
- JWT settings

## Development

### Run in Debug Mode
```bash
export FLASK_ENV=development
export FLASK_DEBUG=1
python run.py
```

### Create Database Backup
```bash
cp hotspot_billing.db hotspot_billing.db.backup
```

### Reset Database
```bash
rm hotspot_billing.db
python run.py
# Then run seed-data command
```

## Security Notes

⚠️ **Production Deployment:**
- Change all SECRET_KEYs in config.py
- Enable HTTPS (SESSION_COOKIE_SECURE = True)
- Use a production database (PostgreSQL recommended)
- Implement rate limiting
- Add input validation
- Set up proper logging
- Use environment variables for sensitive data

## Troubleshooting

### Port Already in Use
```bash
# Change port in run.py or use:
python -m flask --app run run --port 5001
```

### Database Locked
```bash
# Remove the database file and recreate:
rm hotspot_billing.db
python run.py
python -m flask --app run seed-data
```

### Import Errors
```bash
# Reinstall dependencies:
pip install --upgrade -r requirements.txt
```

## Support & Documentation

For API testing, use:
- **Postman**: Import the endpoints and test
- **curl**: Command-line testing (examples above)
- **Python requests**: For automation

## License

This project is provided as-is for the hotspot billing system.

## Version

**v1.0.0** - Initial Release

---

### Built with ❤️ for Hotspot Internet Services
