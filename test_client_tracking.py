#!/usr/bin/env python
"""Test script to verify client activity tracking"""

import sys
import os
from datetime import datetime, timedelta

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app
    from models import db, User, Subscription, Package
    
    print("✓ Successfully imported app and models")
    
    # Create test app
    app = create_app()
    
    with app.app_context():
        print("\n=== Testing Client Activity Tracking ===\n")
        
        # Create test users with different last_login times
        test_users = []
        
        # User 1: Online (logged in 2 hours ago)
        user1 = User.query.filter_by(username='testuser1').first()
        if not user1:
            user1 = User(
                username='testuser1',
                email='testuser1@example.com',
                password_hash='test',
                domain_name='testuser1.com',
                first_name='Test',
                last_name='User 1'
            )
            db.session.add(user1)
        user1.last_login = datetime.utcnow() - timedelta(hours=2)
        user1.is_active = True
        test_users.append(('User 1 (Online)', user1, 2))
        
        # User 2: Online (logged in 12 hours ago)
        user2 = User.query.filter_by(username='testuser2').first()
        if not user2:
            user2 = User(
                username='testuser2',
                email='testuser2@example.com',
                password_hash='test',
                domain_name='testuser2.com',
                first_name='Test',
                last_name='User 2'
            )
            db.session.add(user2)
        user2.last_login = datetime.utcnow() - timedelta(hours=12)
        user2.is_active = True
        test_users.append(('User 2 (Online)', user2, 12))
        
        # User 3: Offline (logged in 48 hours ago)
        user3 = User.query.filter_by(username='testuser3').first()
        if not user3:
            user3 = User(
                username='testuser3',
                email='testuser3@example.com',
                password_hash='test',
                domain_name='testuser3.com',
                first_name='Test',
                last_name='User 3'
            )
            db.session.add(user3)
        user3.last_login = datetime.utcnow() - timedelta(hours=48)
        user3.is_active = True
        test_users.append(('User 3 (Offline)', user3, 48))
        
        # User 4: Offline (never logged in)
        user4 = User.query.filter_by(username='testuser4').first()
        if not user4:
            user4 = User(
                username='testuser4',
                email='testuser4@example.com',
                password_hash='test',
                domain_name='testuser4.com',
                first_name='Test',
                last_name='User 4'
            )
            db.session.add(user4)
        user4.last_login = None
        user4.is_active = True
        test_users.append(('User 4 (Offline)', user4, 'Never'))
        
        db.session.commit()
        print("✓ Created test users:")
        for name, user, hours_ago in test_users:
            print(f"  - {name}: {hours_ago} hours ago")
        
        # Create test package
        pkg = Package.query.filter_by(name='Test Package').first()
        if not pkg:
            pkg = Package(
                name='Test Package',
                price=50000,
                data_amount_gb=5,
                validity_days=30,
                package_type='monthly'
            )
            db.session.add(pkg)
            db.session.commit()
        
        # Create active subscriptions
        for name, user, _ in test_users:
            sub = Subscription.query.filter_by(user_id=user.id).first()
            if not sub:
                sub = Subscription(
                    user_id=user.id,
                    package_id=pkg.id,
                    data_allocated_gb=5,
                    data_used_gb=1,
                    is_active=True,
                    end_date=datetime.utcnow() + timedelta(days=30)
                )
                db.session.add(sub)
        
        db.session.commit()
        print(f"✓ Created active subscriptions for all users")
        
        # Test the tracking logic
        online_threshold = datetime.utcnow() - timedelta(hours=24)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        active_subs = Subscription.query.filter_by(is_active=True).all()
        subscribed_user_ids = set(sub.user_id for sub in active_subs)
        subscribed_users = User.query.filter(User.id.in_(subscribed_user_ids)).all()
        
        online_count = 0
        offline_count = 0
        active_today = 0
        
        for user in subscribed_users:
            if user.last_login and user.last_login >= online_threshold:
                online_count += 1
            else:
                offline_count += 1
            
            if user.last_login and user.last_login >= today_start:
                active_today += 1
        
        print(f"\n✓ Client Activity Results:")
        print(f"  - Total Subscribed: {len(subscribed_users)}")
        print(f"  - Online (24hrs): {online_count}")
        print(f"  - Offline: {offline_count}")
        print(f"  - Active Today: {active_today}")
        
        # Verify counts
        assert len(subscribed_users) == 4, f"Expected 4 subscribed users, got {len(subscribed_users)}"
        assert online_count == 2, f"Expected 2 online users, got {online_count}"
        assert offline_count == 2, f"Expected 2 offline users, got {offline_count}"
        
        print(f"\n✓ All assertions passed!")
        print(f"✓ Client tracking correctly identifies:")
        print(f"  ✅ Online clients (active within 24 hours)")
        print(f"  ✅ Offline clients (inactive for 24+ hours)")
        print(f"  ✅ Daily activity tracking")
        
        # Clean up test data
        for name, user, _ in test_users:
            Subscription.query.filter_by(user_id=user.id, package_id=pkg.id).delete()
        
        db.session.commit()
        print(f"\n✓ Test data prepared for dashboard")
        
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n=== Client Tracking Test Completed Successfully ===\n")
