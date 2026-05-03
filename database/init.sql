-- Fajikunda Society — full schema
-- This file runs automatically when the MySQL container starts for the first time.
-- Safe to re-run: uses IF NOT EXISTS throughout.

CREATE DATABASE IF NOT EXISTS fajikunda_db. CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fajikunda_db;

CREATE TABLE IF NOT EXISTS users (
  id varchar(36) NOT NULL PRIMARY KEY,
  username varchar(30) NOT NULL UNIQUE,
  email varchar(255) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,
  full_name varchar(100) DEFAULT NULL,
  role enum('user','admin','member') DEFAULT 'user',
  avatar_url varchar(512) DEFAULT NULL,
  location varchar(100) DEFAULT NULL,
  bio text DEFAULT NULL,
  is_active tinyint(1) DEFAULT 1,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login datetime DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id int unsigned AUTO_INCREMENT PRIMARY KEY,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  author_id varchar(36),
  priority enum('normal','high','urgent') DEFAULT 'normal',
  is_pinned tinyint(1) DEFAULT 0,
  is_published tinyint(1) DEFAULT 1,
  published_at datetime DEFAULT CURRENT_TIMESTAMP,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS events (
  id int unsigned AUTO_INCREMENT PRIMARY KEY,
  title varchar(255) NOT NULL,
  description text,
  location varchar(255),
  is_virtual tinyint(1) DEFAULT 0,
  meeting_url varchar(512),
  start_date datetime NOT NULL,
  end_date datetime,
  max_rsvp int unsigned,
  rsvp_count int unsigned DEFAULT 0,
  author_id varchar(36),
  is_published tinyint(1) DEFAULT 1,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS event_rsvps (
  id int unsigned AUTO_INCREMENT PRIMARY KEY,
  event_id int unsigned NOT NULL,
  user_id varchar(36) NOT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rsvp (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS news (
  id int unsigned AUTO_INCREMENT PRIMARY KEY,
  title varchar(255) NOT NULL,
  slug varchar(255),
  excerpt text,
  content longtext NOT NULL,
  cover_image varchar(512),
  category varchar(50) DEFAULT 'General',
  author_id varchar(36),
  is_published tinyint(1) DEFAULT 1,
  views int unsigned DEFAULT 0,
  published_at datetime DEFAULT CURRENT_TIMESTAMP,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS donations (
  id int unsigned AUTO_INCREMENT PRIMARY KEY,
  donor_id varchar(36),
  donor_name varchar(100),
  amount decimal(10,2) NOT NULL,
  currency varchar(10) DEFAULT 'GBP',
  purpose varchar(255),
  message text,
  is_anonymous tinyint(1) DEFAULT 0,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id int unsigned AUTO_INCREMENT PRIMARY KEY,
  email varchar(255) NOT NULL,
  token varchar(255) NOT NULL,
  expires_at datetime NOT NULL,
  used tinyint(1) DEFAULT 0,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id int unsigned AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(36) NOT NULL,
  token varchar(512) NOT NULL,
  expires_at datetime NOT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  id int unsigned AUTO_INCREMENT PRIMARY KEY,
  token varchar(512) NOT NULL,
  expires_at datetime NOT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
);
