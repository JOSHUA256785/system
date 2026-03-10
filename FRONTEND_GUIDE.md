# HTML Frontend Setup & Usage Guide

## 📁 Frontend Files

The complete HTML/CSS/JavaScript frontend for the hotspot billing system has been created with the following files:

### Core Files
- **index.html** - Main dashboard with analytics charts
- **login.html** - Login page for user authentication
- **packages.html** - Package management and display
- **styles.css** - Main stylesheet for dashboard
- **login.css** - Login page styling
- **app.js** - Main application JavaScript (chart initialization, API calls)
- **login.js** - Login functionality
- **packages.js** - Package management JavaScript

## 🚀 Quick Start

### 1. Start the Flask Backend
```bash
python run.py
```
The API will be running at `http://localhost:5000`

### 2. Open the Frontend

You can open the HTML files directly in your browser or use a local server:

**Option A: Direct File Opening**
```bash
# On Windows
start index.html

# On Mac
open index.html

# On Linux
firefox index.html
```

**Option B: Using Python HTTP Server** (Recommended)
```bash
# In the centi directory
python -m http.server 8000

# Then open: http://localhost:8000
```

**Option C: Using Node.js Local Server**
```bash
npx http-server

# Then open: http://localhost:8080
```

## 🔐 Login

1. Navigate to `login.html`
2. Default credentials:
   - **Username**: `testuser`
   - **Password**: `test123`
   - (or use admin/admin123 for admin access)
3. Click "Sign In"
4. You'll be redirected to the dashboard

## 📊 Dashboard Features (index.html)

The main dashboard includes:

### Key Metrics Cards
- **Total Revenue** - Monthly earnings in USH
- **Subscribed Clients** - Number of active subscribers
- **Total Clients** - Total user count

### Charts & Analytics

1. **Payments Chart**
   - Bar chart showing monthly payment trends
   - Displays data for Jan-Feb
   - Uses sample data from API responses

2. **Active Users Chart**
   - Line chart with multiple metrics
   - Shows "Current users online" vs "Average users online"
   - Weekly view (Mon-Sun)

3. **Sent SMS Chart**
   - Bar chart of SMS sent from system
   - Shows daily breakdown for the week

4. **Network Data Usage**
   - Combined chart for Download and Upload
   - Shows GB usage per day
   - Displays total usage statistics

5. **Revenue Forecast Chart**
   - 3-series line chart
   - Historical revenue (blue)
   - Forecast revenue (orange)
   - Lower confidence band (gray)

6. **Data Usage Trends**
   - Compares Hotspot vs PPPoE usage
   - Shows monthly trend analysis

### Navigation
- Sidebar menu for different sections
- Top search bar for quick search
- User profile with logout option
- Time display and notifications

## 📦 Packages Page (packages.html)

Displays all internet packages in a table format:

| Column | Description |
|--------|-------------|
| Package Name | Name of the package |
| Price | Cost in USH |
| Data Amount | GB allocation |
| Validity | Days valid |
| Active Users | Users on this package |
| Action | Edit/Stats buttons |

### Features
- Search/filter packages
- Edit existing packages
- View package statistics
- Add new packages (coming soon)

## 🎨 Styling Features

The frontend uses:
- **Color Scheme**: Orange (#f57c00) and white
- **Modern Design**: Rounded corners, shadows, smooth transitions
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Charts**: Chart.js for data visualization
- **Icons**: Unicode emoji for UI icons

## 🔗 API Integration

All frontend pages connect to the Flask backend:

```javascript
// Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Example: Fetch user profile
fetchWithAuth(`${API_BASE_URL}/auth/profile`, 'GET')
    .then(data => {
        // Handle response
    })
    .catch(error => {
        // Handle error
    });
```

### Supported API Calls
- Authentication (login, logout, register)
- Package management (list, create, update, delete)
- Subscription management
- Transaction history
- Usage tracking
- Dashboard analytics

## 🔄 Data Flow

```
User Login (login.html)
    ↓
Authentication (login.js → Flask API)
    ↓
Dashboard (index.html)
    ↓
API Calls (app.js → Flask Backend)
    ↓
Chart Rendering (Chart.js)
    ↓
User Views Analytics
```

## 📱 Responsive Breakpoints

The frontend is optimized for:
- **Desktop**: 1200px+ (full layout)
- **Tablet**: 768px-1199px (adjusted grid)
- **Mobile**: Below 768px (single column, collapsed sidebar)

## 🛠️ Customization

### Change Colors
Edit `styles.css` and `login.css`:
```css
/* Orange color */
--primary-color: #f57c00;
--dark-color: #e65100;

/* Update all references */
background: #f57c00;
color: #f57c00;
```

### Add New Charts
In `app.js`, add new chart initialization:
```javascript
function initNewChart() {
    const ctx = document.getElementById('newChart');
    new Chart(ctx, {
        type: 'bar', // or 'line', 'doughnut', etc.
        data: { /* ... */ },
        options: { /* ... */ }
    });
}
```

### Add Menu Items
In `index.html`, add to sidebar:
```html
<li><a href="#newpage" onclick="loadNewPage()">📄 New Page</a></li>
```

## 🐛 Troubleshooting

### Issue: "Failed to load dashboard"
**Fix**: Ensure Flask server is running on localhost:5000

### Issue: Charts not showing
**Fix**: Check browser console (F12) for errors

### Issue: Login not working
**Fix**:
- Check Flask server is running
- Verify credentials (testuser/test123)
- Check CORS is enabled in Flask

### Issue: Styling looks broken on mobile
**Fix**: Check browser zoom level and responsive settings

## 📊 Data Sources

The dashboard pulls data from these API endpoints:
- `/api/auth/profile` - User information
- `/api/dashboard/user/overview` - User dashboard data
- `/api/dashboard/admin/*` - Admin analytics (if admin)
- `/api/packages` - Package list
- `/api/transactions` - Transaction history
- `/api/usage/*` - Usage statistics

## 🔒 Security Notes

- Credentials are sent via POST to backend
- Sessions use Flask-Login for authentication
- All requests include `credentials: 'include'` for cookie-based auth
- Frontend validates inputs before sending to API

## 📈 Performance Tips

1. **Minimize API Calls**: Data is fetched once on page load
2. **Lazy Load Charts**: Charts initialize when visible
3. **Cache Data**: Consider caching dashboard data
4. **Optimize Images**: Any images should be compressed

## 🎯 Next Steps

1. ✅ Start Flask backend: `python run.py`
2. ✅ Open frontend: `http://localhost:8000` (or direct file)
3. ✅ Login with test credentials
4. ✅ Explore dashboard and analytics
5. ✅ Test package management
6. ✅ Customize colors and branding as needed

## 📄 File Structure

```
centi/
├── index.html           # Main dashboard
├── login.html          # Login page
├── packages.html       # Packages management
├── styles.css          # Main stylesheet
├── login.css           # Login styles
├── app.js              # Main app logic
├── login.js            # Login logic
├── packages.js         # Packages page logic
└── FRONTEND_GUIDE.md   # This file
```

## 🌐 Browser Support

Works on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 💡 Tips

- Use browser DevTools (F12) to debug
- Check Network tab to see API calls
- Use Console to run JavaScript commands
- Try different screen sizes to test responsiveness

---

**Ready to go!** Your hotspot billing system is now complete with a modern frontend and backend API.
