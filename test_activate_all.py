#!/usr/bin/env python
"""Test script to verify the admin `activate-all` helper endpoint."""

import sys
import os
from datetime import datetime, timedelta

# allow imports from workspace
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, User, Package, Subscription
from flask_login import login_user


print("✓ Setting up test environment for activate-all endpoint")
app = create_app()

with app.app_context():
    # ensure database is clean & create some inactive records
    print("--> creating sample inactive data")
    # create an admin user for authentication
    admin = User.query.filter_by(username='activateall_admin').first()
    if not admin:
        admin = User(
            username='activateall_admin',
            email='activateall_admin@example.com',
            password_hash='test',
            domain_name='activateall.com',
            is_admin=True,
            is_active=False  # start inactive to ensure endpoint flips it
        )
        db.session.add(admin)
    # create a normal user, a package and a subscription all inactive
    user = User.query.filter_by(username='inactive_user').first()
    if not user:
        user = User(
            username='inactive_user',
            email='inactive_user@example.com',
            password_hash='test',
            domain_name='inactive_user.com',
            is_active=False
        )
        db.session.add(user)
    pkg = Package.query.filter_by(name='Inactive Package').first()
    if not pkg:
        pkg = Package(
            name='Inactive Package',
            description='used for testing',
            price=10,
            data_amount_gb=1,
            validity_days=1,
            package_type='daily',
            is_active=False
        )
        db.session.add(pkg)
    db.session.commit()
    # create subscription for inactive user/package
    sub = Subscription.query.filter_by(user_id=user.id).first()
    if not sub:
        sub = Subscription(
            user_id=user.id,
            package_id=pkg.id,
            data_allocated_gb=1,
            data_used_gb=0,
            is_active=False,
            end_date=datetime.utcnow() + timedelta(days=1)
        )
        db.session.add(sub)
    db.session.commit()

    # verify starting conditions
    assert not admin.is_active
    assert not user.is_active
    assert not pkg.is_active
    assert not sub.is_active
    print("--> initial state verified (all records inactive)")

    # use Flask test client to call the endpoint
    client = app.test_client()
    with client:
        # log in the admin manually by pushing a request context
        with app.test_request_context():
            login_user(admin)
            print("--> admin user logged in for request")
            resp = client.post('/api/admin/activate-all')

        print(f"--> endpoint responded: {resp.status_code} {resp.data.decode()}")
        assert resp.status_code == 200

    # reload from database to see changes
    db.session.refresh(admin)
    db.session.refresh(user)
    db.session.refresh(pkg)
    db.session.refresh(sub)

    print("--> refreshed records from database after activation")
    assert admin.is_active, "Admin user should be active after endpoint"
    assert user.is_active, "Normal user should be active after endpoint"
    assert pkg.is_active, "Package should be active after endpoint"
    assert sub.is_active, "Subscription should be active after endpoint"

    print("✓ All activation assertions passed")

print("\n=== activate-all endpoint test completed successfully ===\n")
