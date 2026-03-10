# Backend Setup Instructions

## Issue
The registration is showing "Failed to fetch" error because the Flask backend server is not running.

## Solution

### Step 1: Install Python
1. Download Python from: https://www.python.org/downloads/
2. **IMPORTANT**: During installation, check the box "Add Python to PATH"
3. Click "Install Now"

### Step 2: Verify Python Installation
After installing Python, open PowerShell and run:
```powershell
python --version
```

### Step 3: Install Dependencies
In PowerShell, navigate to the project folder and run:
```powershell
cd "c:\Users\Service Cops\Desktop\centi"
pip install -r requirements.txt
```

### Step 4: Start the Backend Server
In PowerShell, run:
```powershell
cd "c:\Users\Service Cops\Desktop\centi"
python run.py
```

You should see output like:
```
 * Running on http://127.0.0.1:5000
 * Press CTRL+C to quit
```

### Step 5: Test Registration
1. Once the server is running, open your browser to:
   `http://127.0.0.1:5500/register.html`

2. Fill in the test form:
   - First Name: John
   - Last Name: Doe
   - Username: johndoe
   - Email: john@example.com
   - Phone: +256700000000
   - Password: Test12345
   - Confirm Password: Test12345
   - Accept Terms

3. Click "Create Account"

4. If successful, you'll see a message showing your auto-generated domain and be redirected to login

### Step 6: Login
Use credentials:
- Username: johndoe
- Password: Test12345

## What Happens
- Your account is created in the database
- A domain is automatically generated: `johndoe.centi.local`
- 2FA is available to enable in Settings > Security (2FA)
- You can manage your account in the dashboard

## Troubleshooting

**Error: pip command not found**
- Python was not installed correctly or not added to PATH
- Reinstall Python, making sure to check "Add Python to PATH"

**Error: ModuleNotFoundError**
- Run: `pip install -r requirements.txt` to install missing packages

**Port already in use**
- Change port in `run.py` or stop the process using port 5000

## Database Reset (if needed)
If you want to start fresh:
```powershell
rm instance/hotspot.db  # Remove old database
python run.py           # Server will create new database
```
