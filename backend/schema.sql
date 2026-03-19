-- ============================================================================
-- Campus Marketplace PostgreSQL Schema
-- SQL-First Architecture - No ORM
-- ============================================================================

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20),
    year VARCHAR(20),
    hostel_name VARCHAR(100),
    room_number VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Index for email lookups (login, uniqueness checks)
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- CATEGORIES TABLE (Self-referential for hierarchy)
-- ============================================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    parent_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_categories_parent 
        FOREIGN KEY (parent_id) 
        REFERENCES categories(id) 
        ON DELETE SET NULL
);

-- Index for parent lookups (subcategory queries)
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================================================
-- ITEMS TABLE
-- ============================================================================
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    seller_id UUID NOT NULL,
    category_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_items_price_non_negative 
        CHECK (price >= 0),
    CONSTRAINT chk_items_status_valid 
        CHECK (status IN ('available', 'reserved', 'sold')),
    
    -- Foreign Keys
    CONSTRAINT fk_items_seller 
        FOREIGN KEY (seller_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_items_category 
        FOREIGN KEY (category_id) 
        REFERENCES categories(id) 
        ON DELETE RESTRICT
);

-- Indexes for common query patterns
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_seller ON items(seller_id);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_created_at ON items(created_at DESC);

-- ============================================================================
-- RESERVATIONS TABLE
-- ============================================================================
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Constraints
    CONSTRAINT chk_reservations_status_valid 
        CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    
    -- Foreign Keys
    CONSTRAINT fk_reservations_item 
        FOREIGN KEY (item_id) 
        REFERENCES items(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_reservations_buyer 
        FOREIGN KEY (buyer_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Indexes for reservation queries
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_buyer ON reservations(buyer_id);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at);

-- Partial index to ensure only ONE active reservation per item
-- This enforces exclusivity while allowing history (cancelled/expired/completed)
CREATE UNIQUE INDEX uq_active_reservations_item ON reservations(item_id) WHERE status = 'active';