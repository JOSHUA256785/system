from flask import Flask
from flask_login import LoginManager
from config import config
from models import db, User
import os

def create_app(config_name=None):
    """Application factory"""
    
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    
    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(user_id)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.packages import packages_bp
    from routes.subscriptions import subscriptions_bp
    from routes.transactions import transactions_bp
    from routes.usage import usage_bp
    from routes.dashboard import dashboard_bp
    from routes.admin import admin_bp
    from routes.devices import devices_bp
    from routes.finance import finance_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(packages_bp)
    app.register_blueprint(subscriptions_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(usage_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(devices_bp)
    app.register_blueprint(finance_bp)
    
    # Create database tables
    with app.app_context():
        db.create_all()
        
        # Initialize default admin user if doesn't exist
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            import uuid
            admin_user = User(
                id=str(uuid.uuid4()),
                username='admin',
                email='admin@centi.local',
                phone='+256700000000',
                first_name='System',
                last_name='Administrator',
                domain_name='admin.centi.local',
                domain_status='active',
                account_balance=10000.0,
                is_active=True,
                is_admin=True
            )
            admin_user.set_password('admin')
            db.session.add(admin_user)
            db.session.commit()
            print("✓ Default admin user created (username: admin, password: admin)")
    
    return app

# Create app instance
app = create_app()
