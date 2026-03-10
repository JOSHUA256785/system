#!/usr/bin/env python
"""
Hotspot Billing System - Main Entry Point
"""

import os
from app import create_app
from models import db, User, Package
from datetime import datetime, timedelta

# Create app instance
app = create_app(os.environ.get('FLASK_ENV', 'development'))

@app.shell_context_processor
def make_shell_context():
    """Create shell context for Flask CLI"""
    return {'db': db, 'User': User, 'Package': Package}

@app.cli.command()
def init_db():
    """Initialize the database with seed data."""
    db.create_all()
    print('Database initialized.')

@app.cli.command()
def seed_data():
    """Seed database with sample data."""
    
    # Create admin user if doesn't exist
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            id='admin-001',
            username='admin',
            email='admin@hotspot.local',
            phone='+256700000000',
            first_name='System',
            last_name='Admin',
            is_admin=True,
            is_active=True,
            account_balance=0.0
        )
        admin.set_password('admin123')
        db.session.add(admin)
        print('Admin user created: admin / admin123')
    
    # Create sample packages based on the dashboard images
    packages_data = [
        {
            'name': '6HRS UNLIMITED',
            'description': '6 hours of unlimited internet access',
            'price': 500.00,
            'data_amount_gb': 100.0,
            'validity_days': 1,
            'package_type': 'hourly'
        },
        {
            'name': '24HRS UNLIMITED',
            'description': '24 hours of unlimited internet access',
            'price': 1200.00,
            'data_amount_gb': 100.0,
            'validity_days': 1,
            'package_type': 'daily'
        },
        {
            'name': 'WELCOME',
            'description': 'Welcome package for new users',
            'price': 0.00,
            'data_amount_gb': 10.0,
            'validity_days': 7,
            'package_type': 'weekly'
        },
        {
            'name': '8 HRS UNLIMITED',
            'description': '8 hours of unlimited internet access',
            'price': 700.00,
            'data_amount_gb': 100.0,
            'validity_days': 1,
            'package_type': 'hourly'
        },
        {
            'name': '7DAYS UNLIMITED',
            'description': '7 days of unlimited internet access',
            'price': 4200.00,
            'data_amount_gb': 100.0,
            'validity_days': 7,
            'package_type': 'weekly'
        },
        {
            'name': '30DAYS UNLIMITED',
            'description': '30 days of unlimited internet access',
            'price': 3500.00,
            'data_amount_gb': 100.0,
            'validity_days': 30,
            'package_type': 'monthly'
        },
        {
            'name': '30DAYS VIP',
            'description': '30 days VIP internet with priority support',
            'price': 14200.00,
            'data_amount_gb': 100.0,
            'validity_days': 30,
            'package_type': 'monthly'
        },
        {
            'name': '140DAYS VIP',
            'description': '140 days VIP internet with priority support',
            'price': 7200.00,
            'data_amount_gb': 100.0,
            'validity_days': 140,
            'package_type': 'long_term'
        }
    ]
    
    existing_packages = Package.query.count()
    if existing_packages == 0:
        for pkg_data in packages_data:
            pkg = Package(
                id=f'pkg-{pkg_data["name"].lower().replace(" ", "-")}',
                name=pkg_data['name'],
                description=pkg_data['description'],
                price=pkg_data['price'],
                currency='USH',
                data_amount_gb=pkg_data['data_amount_gb'],
                validity_days=pkg_data['validity_days'],
                package_type=pkg_data['package_type'],
                is_active=True
            )
            db.session.add(pkg)
        print(f'Created {len(packages_data)} sample packages')
    
    db.session.commit()
    print('Database seeded successfully!')

@app.cli.command()
def create_test_user():
    """Create a test user for development"""
    
    test_user = User.query.filter_by(username='testuser').first()
    if not test_user:
        test_user = User(
            id='test-001',
            username='testuser',
            email='test@example.com',
            phone='+256701234567',
            first_name='Test',
            last_name='User',
            account_balance=50000.0,  # Give test user some credit
            is_active=True
        )
        test_user.set_password('test123')
        db.session.add(test_user)
        db.session.commit()
        print('Test user created: testuser / test123')
        print('Account balance: 50,000 USH')
    else:
        print('Test user already exists')

if __name__ == '__main__':
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║          HOTSPOT BILLING SYSTEM v1.0                         ║
    ║                                                              ║
    ║  Starting Flask Development Server...                        ║
    ╚══════════════════════════════════════════════════════════════╝
    
    API Documentation:
    
    Authentication:
    - GET/POST /api/auth/register        (Register new user)
    - POST /api/auth/login               (Login)
    - POST /api/auth/logout              (Logout)
    - GET /api/auth/profile              (Get profile)
    - PUT /api/auth/profile              (Update profile)
    
    Packages:
    - GET /api/packages                  (List packages)
    - GET /api/packages/<id>             (Get package details)
    - POST /api/packages                 (Create - Admin)
    - PUT /api/packages/<id>             (Update - Admin)
    - DELETE /api/packages/<id>          (Delete - Admin)
    
    Subscriptions:
    - GET /api/subscriptions             (List user subscriptions)
    - POST /api/subscriptions/purchase/<pkg_id>  (Buy package)
    - POST /api/subscriptions/<id>/renew (Renew subscription)
    - POST /api/subscriptions/<id>/cancel (Cancel subscription)
    
    Billing:
    - GET /api/transactions              (List transactions)
    - POST /api/transactions/topup       (Add credit)
    - POST /api/transactions/refund      (Request refund)
    
    Usage Tracking:
    - POST /api/usage/log                (Log data usage)
    - GET /api/usage/current             (Current usage)
    - GET /api/usage/history             (Usage history)
    - GET /api/usage/daily-summary       (Daily stats)
    
    Dashboard:
    - GET /api/dashboard/user/overview   (User overview)
    - GET /api/dashboard/admin/*         (Admin reports)
    """)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
