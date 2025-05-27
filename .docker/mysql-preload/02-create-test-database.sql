-- Create test database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ghost_test;

-- Grant all privileges to root user on test database
GRANT ALL PRIVILEGES ON ghost_test.* TO 'root'@'%';
FLUSH PRIVILEGES;
