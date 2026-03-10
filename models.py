from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import uuid

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model for hotspot customers"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(120), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Domain management
    domain_name = db.Column(db.String(120), unique=True, nullable=False, index=True)
    domain_status = db.Column(db.String(50), default='active')  # active, inactive, pending
    
    # Two-Factor Authentication (2FA)
    two_factor_enabled = db.Column(db.Boolean, default=False)
    two_factor_secret = db.Column(db.String(255), nullable=True)  # TOTP secret
    backup_codes = db.Column(db.Text, nullable=True)  # JSON array of backup codes
    
    # Profile information
    first_name = db.Column(db.String(120))
    last_name = db.Column(db.String(120))
    country = db.Column(db.String(100), nullable=True)  # Country name
    country_code = db.Column(db.String(3), nullable=True)  # Country code (e.g., UG, KE, TZ)
    phone_code = db.Column(db.String(5), nullable=True)  # International phone code (e.g., +256)
    
    # Account status
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    
    # Account balance and credit
    account_balance = db.Column(db.Float, default=0.0)  # USH balance
    total_spent = db.Column(db.Float, default=0.0)  # Lifetime spending
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    transactions = db.relationship('Transaction', back_populates='user', cascade='all, delete-orphan')
    usage_logs = db.relationship('UsageLog', back_populates='user', cascade='all, delete-orphan')
    subscriptions = db.relationship('Subscription', back_populates='user', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash"""
        return check_password_hash(self.password_hash, password)
    
    def get_active_subscription(self):
        """Get user's active subscription"""
        return Subscription.query.filter_by(
            user_id=self.id,
            is_active=True
        ).first()
    
    def get_remaining_data(self):
        """Get remaining data for active subscription"""
        sub = self.get_active_subscription()
        if not sub:
            return 0.0
        return sub.get_remaining_data()
    
    def generate_2fa_secret(self):
        """Generate new 2FA secret"""
        import pyotp
        return pyotp.random_base32()
    
    def get_2fa_qrcode(self):
        """Get QR code for 2FA setup"""
        import pyotp
        if not self.two_factor_secret:
            return None
        totp = pyotp.TOTP(self.two_factor_secret)
        return totp.provisioning_uri(
            name=self.username,
            issuer_name='SERVICE COPS'
        )
    
    def verify_2fa_token(self, token):
        """Verify 2FA token"""
        import pyotp
        if not self.two_factor_secret:
            return False
        totp = pyotp.TOTP(self.two_factor_secret)
        # Allow for time skew (current and previous token)
        return totp.verify(token, valid_window=1)
    
    def generate_backup_codes(self, count=10):
        """Generate backup codes for 2FA"""
        import json
        import secrets
        codes = [secrets.token_hex(4).upper() for _ in range(count)]
        self.backup_codes = json.dumps(codes)
        return codes
    
    def use_backup_code(self, code):
        """Use a backup code"""
        import json
        if not self.backup_codes:
            return False
        codes = json.loads(self.backup_codes)
        if code.upper() in codes:
            codes.remove(code.upper())
            self.backup_codes = json.dumps(codes)
            db.session.commit()
            return True
        return False
    
    def get_remaining_backup_codes(self):
        """Get count of remaining backup codes"""
        import json
        if not self.backup_codes:
            return 0
        return len(json.loads(self.backup_codes))
    
    def __repr__(self):
        return f'<User {self.username}>'


class Package(db.Model):
    """Hotspot data packages"""
    __tablename__ = 'packages'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(120), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    
    # Pricing in USH (Ugandan Shilling)
    price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USH')
    
    # Data allocation
    data_amount_gb = db.Column(db.Float, nullable=False)  # GB
    validity_days = db.Column(db.Integer, nullable=False)  # Days valid
    
    # Package type
    package_type = db.Column(db.String(50), nullable=False)  # 'hourly', 'daily', 'weekly', 'monthly'
    
    # Status
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = db.relationship('Subscription', back_populates='package', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Package {self.name}>'


class Subscription(db.Model):
    """User subscriptions to packages"""
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    package_id = db.Column(db.String(36), db.ForeignKey('packages.id'), nullable=False, index=True)
    
    # Data tracking
    data_allocated_gb = db.Column(db.Float, nullable=False)  # GB allocated
    data_used_gb = db.Column(db.Float, default=0.0)  # GB used
    
    # Subscription period
    start_date = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    end_date = db.Column(db.DateTime, nullable=False, index=True)  # Expiry date
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Status
    auto_renew = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='subscriptions')
    package = db.relationship('Package', back_populates='subscriptions')
    
    def is_expired(self):
        """Check if subscription is expired"""
        return datetime.utcnow() > self.end_date
    
    def get_remaining_data(self):
        """Get remaining data in GB"""
        remaining = self.data_allocated_gb - self.data_used_gb
        return max(0.0, remaining)
    
    def get_status(self):
        """Get subscription status"""
        if not self.is_active:
            return 'inactive'
        if self.is_expired():
            return 'expired'
        return 'active'
    
    def __repr__(self):
        return f'<Subscription {self.user_id} - {self.package_id}>'


class Transaction(db.Model):
    """Billing transactions"""
    __tablename__ = 'transactions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Transaction details
    transaction_type = db.Column(db.String(50), nullable=False)  # 'purchase', 'refund', 'topup', 'subscription'
    amount = db.Column(db.Float, nullable=False)  # USH
    currency = db.Column(db.String(10), default='USH')
    
    # Description and reference
    description = db.Column(db.Text)
    reference = db.Column(db.String(120), unique=True, nullable=False, index=True)
    
    # Payment method
    payment_method = db.Column(db.String(50))  # 'credit_card', 'mobile_money', 'cash', 'bank_transfer'
    
    # Status
    status = db.Column(db.String(50), default='completed', index=True)  # 'pending', 'completed', 'failed', 'refunded'
    
    # Package purchased (if applicable)
    package_id = db.Column(db.String(36), db.ForeignKey('packages.id'), nullable=True)
    
    # Mobile money metadata (stored as JSON string)
    metadata = db.Column(db.Text, nullable=True)  # JSON data for mobile money providers, phone number, etc.
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='transactions')
    
    def set_metadata(self, metadata_dict):
        """Set metadata as JSON"""
        import json
        self.metadata = json.dumps(metadata_dict)
    
    def get_metadata(self):
        """Get metadata as dictionary"""
        import json
        if not self.metadata:
            return {}
        try:
            return json.loads(self.metadata)
        except:
            return {}
    
    def __repr__(self):
        return f'<Transaction {self.reference}>'


class UsageLog(db.Model):
    """Data usage logs"""
    __tablename__ = 'usage_logs'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    subscription_id = db.Column(db.String(36), db.ForeignKey('subscriptions.id'), nullable=True)
    
    # Usage details
    data_used_mb = db.Column(db.Float, nullable=False)  # MB used in this session
    session_duration_minutes = db.Column(db.Integer)  # Session duration in minutes
    
    # Session info
    start_time = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    end_time = db.Column(db.DateTime)
    
    # Network info
    ip_address = db.Column(db.String(45))
    device_type = db.Column(db.String(50))  # 'mobile', 'tablet', 'laptop', etc.
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = db.relationship('User', back_populates='usage_logs')
    
    def __repr__(self):
        return f'<UsageLog {self.user_id} - {self.data_used_mb}MB>'


class Invoice(db.Model):
    """Invoice records"""
    __tablename__ = 'invoices'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Invoice details
    invoice_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    total_amount = db.Column(db.Float, nullable=False)  # USH
    currency = db.Column(db.String(10), default='USH')
    
    # Items on invoice (JSON)
    items = db.Column(db.JSON)  # List of {package: name, amount: price, qty: 1}
    
    # Status
    status = db.Column(db.String(50), default='issued', index=True)  # 'issued', 'paid', 'overdue', 'cancelled'
    
    # Dates
    issue_date = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    due_date = db.Column(db.DateTime)
    paid_date = db.Column(db.DateTime, nullable=True)
    
    # Notes
    notes = db.Column(db.Text)
    
    # Relationships
    user = db.relationship('User')
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'


class Report(db.Model):
    """System reports and statistics"""
    __tablename__ = 'reports'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Report type
    report_type = db.Column(db.String(50), nullable=False, index=True)  # 'revenue', 'users', 'usage', 'packages'
    
    # Report period
    period_start = db.Column(db.DateTime, nullable=False, index=True)
    period_end = db.Column(db.DateTime, nullable=False, index=True)
    
    # Data (JSON)
    data = db.Column(db.JSON)  # Report metrics
    
    # Timestamps
    generated_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f'<Report {self.report_type} - {self.period_start}>'


class SystemAgent(db.Model):
    """System agents for monitoring site locations and performance"""
    __tablename__ = 'system_agents'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Agent identification
    agent_name = db.Column(db.String(120), nullable=False, index=True)
    agent_type = db.Column(db.String(50), nullable=False)  # 'monitoring', 'backup', 'maintenance'
    description = db.Column(db.Text)
    
    # Location information
    site_location = db.Column(db.String(200), nullable=False)  # Site name/address
    latitude = db.Column(db.Float)  # GPS latitude
    longitude = db.Column(db.Float)  # GPS longitude
    region = db.Column(db.String(120))  # Region/District
    
    # Agent personnel details
    contact_number = db.Column(db.String(20))  # Phone number of agent operator
    role = db.Column(db.String(120))  # Role/title of agent operator (e.g., Site Manager, Technician)
    permissions = db.Column(db.JSON, default=dict)  # JSON object with permissions {view, edit, delete, monitor}
    
    # Agent status and credentials
    status = db.Column(db.String(50), default='active')  # active, inactive, offline
    api_key = db.Column(db.String(255), unique=True, nullable=False)
    last_heartbeat = db.Column(db.DateTime)  # Last ping from agent
    
    # Performance metrics
    cpu_usage = db.Column(db.Float, default=0.0)  # Percentage
    memory_usage = db.Column(db.Float, default=0.0)  # Percentage
    network_status = db.Column(db.String(50), default='connected')  # connected, degraded, offline
    temperature = db.Column(db.Float)  # Celsius
    
    # Assigned to admin user
    admin_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    admin_user = db.relationship('User', foreign_keys=[admin_user_id])
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_health_status(self):
        """Determine overall health status of agent"""
        if self.status == 'inactive':
            return 'Inactive'
        
        # Check last heartbeat (should be within 5 minutes)
        if self.last_heartbeat:
            time_since_heartbeat = datetime.utcnow() - self.last_heartbeat
            if time_since_heartbeat.total_seconds() > 300:
                return 'Offline'
        
        # Check metrics
        if self.cpu_usage > 90 or self.memory_usage > 85:
            return 'Degraded'
        
        if self.network_status == 'offline':
            return 'Offline'
        
        return 'Healthy'
    
    def __repr__(self):
        return f'<SystemAgent {self.agent_name} - {self.site_location}>'


class Device(db.Model):
    """Connected devices for users (routers, modems, hotspots)"""
    __tablename__ = 'devices'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Device information
    device_name = db.Column(db.String(120), nullable=False, index=True)
    device_type = db.Column(db.String(50), nullable=False)  # 'router', 'modem', 'hotspot', 'laptop', 'phone'
    device_model = db.Column(db.String(120))  # e.g., TP-Link WR940N, Huawei B535
    mac_address = db.Column(db.String(17), unique=True)  # Hardware address
    
    # Device vendor/manufacturer
    vendor = db.Column(db.String(120), nullable=False)  # mikrotik, tp-link, cisco, ubiquiti, huawei, etc.
    device_firmware = db.Column(db.String(120))  # Firmware version
    
    # API Integration
    api_enabled = db.Column(db.Boolean, default=False)  # Can device access billing system
    api_key = db.Column(db.String(255), unique=True, nullable=True)  # API token for device
    api_secret = db.Column(db.String(255), nullable=True)  # Secret/password for device API
    integration_type = db.Column(db.String(50))  # rest, ssh, snmp, netconf, modbus
    api_url = db.Column(db.String(255))  # Device API endpoint URL
    
    # Device status
    status = db.Column(db.String(50), default='active')  # active, inactive, offline, suspended
    is_online = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime)
    last_sync = db.Column(db.DateTime)  # Last API sync
    
    # Connection info
    ip_address = db.Column(db.String(45))  # IPv4 or IPv6
    signal_strength = db.Column(db.Float)  # WiFi signal strength in dBm
    bandwidth_usage = db.Column(db.Float, default=0.0)  # MB/s
    
    # Billing Dashboard Access
    billing_access = db.Column(db.Boolean, default=False)  # Can access user's billing data
    data_monitoring = db.Column(db.Boolean, default=True)  # Monitor data usage
    auto_disconnect = db.Column(db.Boolean, default=False)  # Auto disconnect when quota reached
    bandwidth_limit = db.Column(db.Float)  # Max bandwidth in MB/s (None = unlimited)
    data_limit_gb = db.Column(db.Float)  # Monthly data limit in GB (None = unlimited)
    
    # Data Usage Tracking
    used_data_gb = db.Column(db.Float, default=0.0)  # Currently used data in GB (this month/period)
    total_used_data_gb = db.Column(db.Float, default=0.0)  # Lifetime data usage in GB
    data_usage_percent = db.Column(db.Float, default=0.0)  # Percentage of limit used (0-100%)
    last_data_sync = db.Column(db.DateTime)  # Last time data usage was synced from device
    
    # Provisioning Status
    provisioning_status = db.Column(db.String(50), default='pending')  # pending, in_progress, configured, failed, deprovisioning
    provisioning_started_at = db.Column(db.DateTime)  # When provisioning began
    provisioning_completed_at = db.Column(db.DateTime)  # When provisioning finished
    provisioning_error = db.Column(db.Text)  # Error message if provisioning failed
    
    # Integration status
    integration_status = db.Column(db.String(50), default='pending')  # pending, active, failed, inactive
    last_error = db.Column(db.Text)  # Last API error message
    
    # Remote Management & Access
    management_url = db.Column(db.String(255))  # URL for remote management (e.g., https://IP, winbox://IP)
    management_type = db.Column(db.String(50))  # Type of interface: web, winbox, ssh, cloud, console
    management_credentials = db.Column(db.String(255))  # Encrypted credentials for management access
    remote_access_info = db.Column(db.Text)  # JSON with vendor-specific remote access details
    
    # Ownership
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', foreign_keys=[user_id])
    
    # API Key Management
    api_keys = db.relationship('DeviceAPIKey', back_populates='device', cascade='all, delete-orphan')
    
    # Timestamps
    registered_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Device {self.device_name} ({self.vendor} - {self.device_type})>'


class DeviceAPIKey(db.Model):
    """Secure storage for device API keys and credentials"""
    __tablename__ = 'device_api_keys'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # API Key Information
    key_name = db.Column(db.String(120), nullable=False)  # User-friendly name (e.g., "Primary Key", "Backup Key")
    api_key = db.Column(db.String(512), nullable=False, unique=True)  # Encrypted/hashed API key
    key_type = db.Column(db.String(50), default='primary')  # primary, secondary, backup, webhook
    
    # Key Status
    is_active = db.Column(db.Boolean, default=True)  # Can be disabled without deletion
    is_used = db.Column(db.Boolean, default=False)  # Has been used at least once
    last_used_at = db.Column(db.DateTime)  # When key was last used
    last_rotated_at = db.Column(db.DateTime)  # When key was last rotated
    
    # Key Metadata
    description = db.Column(db.Text)  # Notes about what this key is for
    ip_whitelist = db.Column(db.String(500))  # Comma-separated IPs allowed to use this key
    scope = db.Column(db.String(200), default='all')  # Permissions: all, read-only, billing-only
    
    # Key Rotation Policy
    rotation_days = db.Column(db.Integer)  # Days before key should be rotated
    next_rotation_date = db.Column(db.DateTime)  # When key should be rotated
    
    # Security Audit
    created_by = db.Column(db.String(120))  # User who created the key
    created_from_ip = db.Column(db.String(45))  # IP address where key was created
    access_log = db.Column(db.Text)  # JSON log of access events
    
    # Device Association
    device_id = db.Column(db.String(36), db.ForeignKey('devices.id'), nullable=False)
    device = db.relationship('Device', back_populates='api_keys')
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = db.Column(db.DateTime)  # Optional key expiration date
    
    def __repr__(self):
        return f'<DeviceAPIKey {self.key_name} for {self.device_id}>'
