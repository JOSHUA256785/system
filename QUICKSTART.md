# Quick Start Guide - Hotspot Billing System

Get up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 2: Start the Application

```bash
python run.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
 * Press CTRL+C to quit
```

## Step 3: Initialize Database (First Time Only)

In another terminal:

```bash
# Seed the database with sample data
python -m flask --app run seed-data
python -m flask --app run create-test-user
```

## Step 4: Test the System

### Option A: Using Postman
1. Open Postman
2. Create a new request
3. Test login endpoint:
   - URL: `http://localhost:5000/api/auth/login`
   - Method: POST
   - Body (JSON):
   ```json
   {
     "username": "testuser",
     "password": "test123"
   }
   ```

### Option B: Using curl

```bash
# 1. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"testuser","password":"test123"}'

# 2. View packages
curl http://localhost:5000/api/packages

# 3. Check dashboard
curl -b cookies.txt http://localhost:5000/api/dashboard/user/overview

# 4. Check current balance (50,000 USH by default)
curl -b cookies.txt http://localhost:5000/api/auth/profile
```

### Option C: Using Python

```python
import requests

BASE_URL = "http://localhost:5000/api"
session = requests.Session()

# Login
response = session.post(f"{BASE_URL}/auth/login", json={
    "username": "testuser",
    "password": "test123"
})
print("Login:", response.json())

# Get packages
response = session.get(f"{BASE_URL}/packages")
print("Packages:", response.json())

# Get user overview
response = session.get(f"{BASE_URL}/dashboard/user/overview")
print("Dashboard:", response.json())
```

## Test Accounts

After initialization:

| Username | Password | Role | Balance |
|----------|----------|------|---------|
| admin | admin123 | Admin | 0 USH |
| testuser | test123 | User | 50,000 USH |

## Key Endpoints to Try

1. **List all packages**
   ```
   GET http://localhost:5000/api/packages
   ```

2. **Get user profile**
   ```
   GET http://localhost:5000/api/auth/profile
   (requires login)
   ```

3. **Purchase a package**
   ```
   POST http://localhost:5000/api/subscriptions/purchase/pkg-6hrs-unlimited
   (requires login and sufficient balance)
   ```

4. **Log data usage**
   ```
   POST http://localhost:5000/api/usage/log
   {
     "data_used_mb": 500,
     "device_type": "mobile"
   }
   ```

5. **View dashboard**
   ```
   GET http://localhost:5000/api/dashboard/user/overview
   (requires login)
   ```

## Common Tasks

### Register a New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser123",
    "email": "new@example.com",
    "phone": "+256700000123",
    "password": "mypassword123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Add Credit to Account
```bash
# Login first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"testuser","password":"test123"}'

# Add credit
curl -X POST http://localhost:5000/api/transactions/topup \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"amount": 10000, "payment_method": "mobile_money"}'
```

### Purchase a Package
```bash
curl -X POST http://localhost:5000/api/subscriptions/purchase/pkg-24hrs-unlimited \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Check Active Subscription
```bash
curl -X GET http://localhost:5000/api/subscriptions/active \
  -b cookies.txt
```

### View Admin Dashboard (as admin)
```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"admin","password":"admin123"}'

# Get system overview
curl -X GET http://localhost:5000/api/dashboard/admin/system-overview \
  -b cookies.txt
```

## Database Structure

The system uses SQLite by default. Database file: `hotspot_billing.db`

Tables:
- `user` - User accounts
- `package` - Internet packages
- `subscription` - User subscriptions
- `transaction` - Billing transactions
- `usage_log` - Data usage logs
- `invoice` - Invoices
- `report` - System reports

## Troubleshooting

### Issue: "Port 5000 is already in use"
**Solution:** Kill the process or use a different port
```bash
# Linux/Mac
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: Database is locked
**Solution:** Delete and recreate the database
```bash
rm hotspot_billing.db
python run.py
python -m flask --app run seed-data
```

### Issue: Module not found errors
**Solution:** Reinstall requirements
```bash
pip install --upgrade -r requirements.txt
```

### Issue: Can't login
**Solution:** Verify credentials match exactly (case-sensitive)
- Username: `testuser`
- Password: `test123`

## Next Steps

1. Read the full [README.md](README.md) for complete documentation
2. Explore all API endpoints with the endpoint list in README.md
3. Customize packages in the database
4. Create a frontend application using React/Vue/Angular
5. Integrate with a payment gateway for real transactions
6. Set up email notifications
7. Deploy to production

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review the code comments in `routes/*.py` files
- Check `models.py` for database structure
- Ensure all dependencies are installed: `pip install -r requirements.txt`

---

Happy Billing! 🚀
