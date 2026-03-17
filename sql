-- Created with Sourcetable.com

-- 1. Users Table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(120) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  domain_name VARCHAR(120) UNIQUE NOT NULL,
  domain_status VARCHAR(50) DEFAULT 'active',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  backup_codes TEXT,
  first_name VARCHAR(120),
  last_name VARCHAR(120),
  country VARCHAR(100),
  country_code VARCHAR(3),
  phone_code VARCHAR(5),
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  account_balance FLOAT DEFAULT 0.0,
  total_spent FLOAT DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Indexes for users
CREATE INDEX idx_users_username ON users (username);

CREATE INDEX idx_users_email ON users (email);

CREATE INDEX idx_users_domain_name ON users (domain_name);

CREATE INDEX idx_users_created_at ON users (created_at);

-- 2. Packages Table
CREATE TABLE packages (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  price FLOAT NOT NULL,
  currency VARCHAR(10) DEFAULT 'USH',
  data_amount_gb FLOAT NOT NULL,
  validity_days INTEGER NOT NULL,
  package_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_packages_name ON packages (name);

CREATE INDEX idx_packages_is_active ON packages (is_active);

-- 3. Subscriptions Table
CREATE TABLE subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  package_id VARCHAR(36) NOT NULL,
  data_allocated_gb FLOAT NOT NULL,
  data_used_gb FLOAT DEFAULT 0.0,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);

CREATE INDEX idx_subscriptions_package_id ON subscriptions (package_id);

CREATE INDEX idx_subscriptions_start_date ON subscriptions (start_date);

CREATE INDEX idx_subscriptions_end_date ON subscriptions (end_date);

CREATE INDEX idx_subscriptions_is_active ON subscriptions (is_active);

-- 4. Transactions Table
CREATE TABLE transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  amount FLOAT NOT NULL,
  currency VARCHAR(10) DEFAULT 'USH',
  description TEXT,
  reference VARCHAR(120) UNIQUE NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'completed',
  package_id VARCHAR(36),
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_user_id ON transactions (user_id);

CREATE INDEX idx_transactions_reference ON transactions (reference);

CREATE INDEX idx_transactions_status ON transactions (status);

CREATE INDEX idx_transactions_created_at ON transactions (created_at);

-- 5. Usage Logs Table
CREATE TABLE usage_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  subscription_id VARCHAR(36),
  data_used_mb FLOAT NOT NULL,
  session_duration_minutes INTEGER,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP,
  ip_address VARCHAR(45),
  device_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE SET NULL
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs (user_id);

CREATE INDEX idx_usage_logs_start_time ON usage_logs (start_time);

CREATE INDEX idx_usage_logs_created_at ON usage_logs (created_at);

-- 6. Invoices Table
CREATE TABLE invoices (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  total_amount FLOAT NOT NULL,
  currency VARCHAR(10) DEFAULT 'USH',
  items JSON,
  status VARCHAR(50) DEFAULT 'issued',
  issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP,
  paid_date TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_invoices_user_id ON invoices (user_id);

CREATE INDEX idx_invoices_invoice_number ON invoices (invoice_number);

CREATE INDEX idx_invoices_status ON invoices (status);

CREATE INDEX idx_invoices_issue_date ON invoices (issue_date);

-- 7. Reports Table
CREATE TABLE reports (
  id VARCHAR(36) PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  data JSON,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_report_type ON reports (report_type);

CREATE INDEX idx_reports_period_start ON reports (period_start);

CREATE INDEX idx_reports_period_end ON reports (period_end);

CREATE INDEX idx_reports_generated_at ON reports (generated_at);

-- 8. System Agents Table
CREATE TABLE system_agents (
  id VARCHAR(36) PRIMARY KEY,
  agent_name VARCHAR(120) NOT NULL,
  agent_type VARCHAR(50) NOT NULL,
  description TEXT,
  site_location VARCHAR(200) NOT NULL,
  latitude FLOAT,
  longitude FLOAT,
  region VARCHAR(120),
  contact_number VARCHAR(20),
  role VARCHAR(120),
  permissions JSON,
  status VARCHAR(50) DEFAULT 'active',
  api_key VARCHAR(255) UNIQUE NOT NULL,
  last_heartbeat TIMESTAMP,
  cpu_usage FLOAT DEFAULT 0.0,
  memory_usage FLOAT DEFAULT 0.0,
  network_status VARCHAR(50) DEFAULT 'connected',
  temperature FLOAT,
  admin_user_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_system_agents_agent_name ON system_agents (agent_name);

CREATE INDEX idx_system_agents_created_at ON system_agents (created_at);

-- 9. Devices Table
CREATE TABLE devices (
  id VARCHAR(36) PRIMARY KEY,
  device_name VARCHAR(120) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  device_model VARCHAR(120),
  mac_address VARCHAR(17) UNIQUE,
  vendor VARCHAR(120) NOT NULL,
  device_firmware VARCHAR(120),
  api_enabled BOOLEAN DEFAULT FALSE,
  api_key VARCHAR(255) UNIQUE,
  api_secret VARCHAR(255),
  integration_type VARCHAR(50),
  api_url VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP,
  last_sync TIMESTAMP,
  ip_address VARCHAR(45),
  signal_strength FLOAT,
  bandwidth_usage FLOAT DEFAULT 0.0,
  billing_access BOOLEAN DEFAULT FALSE,
  data_monitoring BOOLEAN DEFAULT TRUE,
  auto_disconnect BOOLEAN DEFAULT FALSE,
  bandwidth_limit FLOAT,
  data_limit_gb FLOAT,
  used_data_gb FLOAT DEFAULT 0.0,
  total_used_data_gb FLOAT DEFAULT 0.0,
  data_usage_percent FLOAT DEFAULT 0.0,
  last_data_sync TIMESTAMP,
  provisioning_status VARCHAR(50) DEFAULT 'pending',
  provisioning_started_at TIMESTAMP,
  provisioning_completed_at TIMESTAMP,
  provisioning_error TEXT,
  integration_status VARCHAR(50) DEFAULT 'pending',
  last_error TEXT,
  management_url VARCHAR(255),
  management_type VARCHAR(50),
  management_credentials VARCHAR(255),
  remote_access_info TEXT,
  user_id VARCHAR(36) NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_devices_device_name ON devices (device_name);

CREATE INDEX idx_devices_registered_at ON devices (registered_at);

-- 10. Device API Keys Table
CREATE TABLE device_api_keys (
  id VARCHAR(36) PRIMARY KEY,
  key_name VARCHAR(120) NOT NULL,
  api_key VARCHAR(512) UNIQUE NOT NULL,
  key_type VARCHAR(50) DEFAULT 'primary',
  is_active BOOLEAN DEFAULT TRUE,
  is_used BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP,
  last_rotated_at TIMESTAMP,
  description TEXT,
  ip_whitelist VARCHAR(500),
  scope VARCHAR(200) DEFAULT 'all',
  rotation_days INTEGER,
  next_rotation_date TIMESTAMP,
  created_by VARCHAR(120),
  created_from_ip VARCHAR(45),
  access_log TEXT,
  device_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE
);

CREATE INDEX idx_device_api_keys_created_at ON device_api_keys (created_at);
