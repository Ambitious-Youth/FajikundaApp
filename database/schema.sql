-- ============================================================
-- Fajikunda Society Database Schema
-- MySQL 8.x
-- Run: mysql -u root -p fajikunda_db < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS fajikunda_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fajikunda_db;

-- ── Users / Members ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(30)  NOT NULL UNIQUE,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(100),
  role        ENUM('member','admin','moderator') DEFAULT 'member',
  avatar_url  VARCHAR(512),
  location    VARCHAR(100),               -- city/country in diaspora
  bio         TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login  DATETIME
);

-- ── Announcements ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  content     TEXT         NOT NULL,
  author_id   INT UNSIGNED,
  priority    ENUM('low','normal','high','urgent') DEFAULT 'normal',
  is_pinned   BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── News ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) NOT NULL UNIQUE,
  excerpt     TEXT,
  content     LONGTEXT     NOT NULL,
  cover_image VARCHAR(512),
  author_id   INT UNSIGNED,
  category    VARCHAR(50)  DEFAULT 'general',
  tags        JSON,
  is_published BOOLEAN DEFAULT FALSE,
  published_at DATETIME,
  views       INT UNSIGNED DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  FULLTEXT INDEX ft_news (title, content)
);

-- ── Events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  location     VARCHAR(200),
  is_virtual   BOOLEAN DEFAULT FALSE,
  meeting_url  VARCHAR(512),
  start_date   DATETIME NOT NULL,
  end_date     DATETIME,
  cover_image  VARCHAR(512),
  organizer_id INT UNSIGNED,
  max_rsvp     INT UNSIGNED,
  is_published BOOLEAN DEFAULT TRUE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Event RSVPs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_rsvps (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id   INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  status     ENUM('going','maybe','not_going') DEFAULT 'going',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rsvp (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

-- ── Donations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  donor_id     INT UNSIGNED,
  donor_name   VARCHAR(100),            -- for anonymous
  amount       DECIMAL(10,2) NOT NULL,
  currency     VARCHAR(3) DEFAULT 'USD',
  purpose      VARCHAR(200),
  message      TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Seed: default admin ──────────────────────────────────────
-- Password: Admin@1234 (change immediately after first login)
INSERT IGNORE INTO users (username, email, password, full_name, role)
VALUES (
  'admin',
  'admin@fajikunda.org',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Fajikunda Admin',
  'admin'
);
