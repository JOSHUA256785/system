#!/usr/bin/env python
"""Test script to verify device status and vendor breakdown API"""

import sys
import os
from datetime import datetime

# allow imports from workspace
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, User, Device
from flask_login import login_user

print("✓ Setting up test environment for device status endpoint")
app = create_app()

with app.app_context():
    # clean up any previous test data
    print("--> creating sample user and devices")
    user = User.query.filter_by(username='device_user').first()
    if not user:
        user = User(
            username='device_user',
            email='device_user@example.com',
            password_hash='test',
            domain_name='device_user.com',
            is_active=True
        )
        db.session.add(user)
    db.session.commit()

    # helper to add device if missing
    def add_device(name, vendor, online):
        d = Device.query.filter_by(device_name=name).first()
        if not d:
            d = Device(
                user_id=user.id,
                device_name=name,
                vendor=vendor,
                device_type='router',
                provisioning_status='configured',
                is_online=online,
                registered_at=datetime.utcnow()
            )
            db.session.add(d)
        else:
            d.is_online = online
        return d

    dev1 = add_device('mikro1', 'mikrotik', True)
    dev2 = add_device('meraki1', 'meraki', False)
    dev3 = add_device('cisco1', 'cisco', True)
    db.session.commit()

    # test API
    client = app.test_client()
    with client:
        with app.test_request_context():
            login_user(user)
            resp = client.get('/api/devices')

        print("--> endpoint responded:", resp.status_code)
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'devices' in data
        assert isinstance(data['devices'], list)
        # check at least our three devices are present with correct online status
        status_map = {d['device_name']: d['is_online'] for d in data['devices']}
        assert status_map.get('mikro1') is True
        assert status_map.get('meraki1') is False
        assert status_map.get('cisco1') is True
        print("--> device statuses returned correctly")

print("\n=== device status API test completed successfully ===\n")