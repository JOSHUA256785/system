#!/usr/bin/env python
"""Test script to verify payment recording and revenue calculation"""

import sys
import os
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app
    from models import db, User, Transaction
    
    print("✓ Successfully imported app and models")
    
    # Create test app
    app = create_app()
    
    with app.app_context():
        print("\n=== Testing Payment Recording and Revenue Calculation ===\n")
        
        # Clean up test data
        Transaction.query.filter(Transaction.reference.like('TEST-%')).delete()
        db.session.commit()
        print("✓ Cleaned up test data")
        
        # Create test transactions for vouchers
        voucher_amount = 50000
        voucher_txn = Transaction(
            id='test-voucher-1',
            user_id=None,
            transaction_type='subscription',
            amount=voucher_amount,
            currency='USH',
            description='Test voucher payment',
            reference='TEST-VOUCHER-001',
            payment_method='voucher',
            status='completed'
        )
        db.session.add(voucher_txn)
        
        # Create test transactions for mobile money
        mobile_amount = 75000
        mobile_txn = Transaction(
            id='test-mobile-1',
            user_id=None,
            transaction_type='subscription',
            amount=mobile_amount,
            currency='USH',
            description='Test mobile money payment',
            reference='TEST-MOBILE-001',
            payment_method='mobile_money',
            status='completed'
        )
        db.session.add(mobile_txn)
        
        db.session.commit()
        print(f"✓ Created test transactions:")
        print(f"  - Voucher: {voucher_amount} USH")
        print(f"  - Mobile Money: {mobile_amount} USH")
        
        # Query back transactions by payment method
        voucher_total = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.payment_method == 'voucher',
            Transaction.status == 'completed',
            Transaction.reference.like('TEST-%')
        ).scalar() or 0
        
        mobile_total = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.payment_method == 'mobile_money',
            Transaction.status == 'completed',
            Transaction.reference.like('TEST-%')
        ).scalar() or 0
        
        combined_total = voucher_total + mobile_total
        
        print(f"\n✓ Revenue by payment method:")
        print(f"  - Voucher total: {voucher_total} USH")
        print(f"  - Mobile Money total: {mobile_total} USH")
        print(f"  - Combined total: {combined_total} USH")
        
        # Verify the totals
        assert voucher_total == voucher_amount, f"Voucher total mismatch: {voucher_total} != {voucher_amount}"
        assert mobile_total == mobile_amount, f"Mobile total mismatch: {mobile_total} != {mobile_amount}"
        assert combined_total == (voucher_amount + mobile_amount), f"Combined total mismatch"
        
        # additionally call the summary API to ensure unbanked/banked classification
        with app.test_client() as client:
            resp = client.get('/api/finance/payments/summary?days=7')
            assert resp.status_code == 200, f"Expected 200 from summary, got {resp.status_code}"
            summary_data = resp.get_json()
            assert 'unbanked' in summary_data and 'banked' in summary_data, "Missing unbanked/banked keys in summary"
            assert summary_data['unbanked']['total'] >= voucher_amount, "Unbanked total should include voucher amount"
            assert summary_data['banked']['total'] >= mobile_amount, "Banked total should include mobile money amount"
            print("\n✓ Summary endpoint returned expected unbanked/banked totals")
        
        print(f"\n✓ All assertions passed!")
        print(f"✓ Payments from both VOUCHERS and MOBILE MONEY are correctly recorded and can be calculated")
        
        # Clean up
        Transaction.query.filter(Transaction.reference.like('TEST-%')).delete()
        db.session.commit()
        print(f"\n✓ Test data cleaned up")
        
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n=== All tests completed successfully ===\n")
