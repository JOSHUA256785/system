#!/usr/bin/env python
"""Test script to verify the Flask app can be imported and run"""

import sys
import traceback

try:
    print("Python version:", sys.version)
    print("Attempting to import Flask...")
    from flask import Flask
    print("✓ Flask imported successfully")
    
    print("Attempting to import app...")
    import app
    print("✓ App module imported successfully")
    
    print("\nAttempting to start Flask app...")
    print("Current working directory:", sys.getenv('PWD', '<not set>'))
    print("Python path:", sys.path[:3])
    
    # Try to run the app
    if hasattr(app, 'app'):
        print("✓ App instance found, attempting to run...")
        app.app.run(debug=True, host='127.0.0.1', port=5000)
    else:
        print("✗ App instance not found in module")
        
except ImportError as e:
    print(f"✗ Import Error: {e}")
    traceback.print_exc()
except Exception as e:
    print(f"✗ Error: {e}")
    traceback.print_exc()
