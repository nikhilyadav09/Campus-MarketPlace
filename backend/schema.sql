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
    password_hash VARCHAR(255),
    google_id VARCHAR(255),
    mobile_number VARCHAR(20),
    year VARCHAR(20),
    hostel_name VARCHAR(100),
    room_number VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_google_id UNIQUE (google_id)
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
    original_price NUMERIC(10, 2) NOT NULL,
    sell_price NUMERIC(10, 2) NOT NULL,
    lease_price_per_month NUMERIC(10, 2),
    allow_purchase BOOLEAN NOT NULL DEFAULT TRUE,
    allow_lease BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    seller_id UUID NOT NULL,
    category_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_items_original_price_positive
        CHECK (original_price > 0),
    CONSTRAINT chk_items_sell_price_valid
        CHECK (sell_price >= original_price * 0.30 AND sell_price <= original_price * 0.50),
    CONSTRAINT chk_items_listing_mode_valid
        CHECK (allow_purchase OR allow_lease),
    CONSTRAINT chk_items_lease_price_valid
        CHECK (
            (allow_lease = FALSE AND lease_price_per_month IS NULL)
            OR (allow_lease = TRUE AND lease_price_per_month >= original_price * 0.03
                AND lease_price_per_month <= original_price * 0.08)
        ),
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
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'purchase',
    lease_amount NUMERIC(10, 2),
    status VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(255),
    seller_release_percentage NUMERIC(5, 2),
    seller_release_amount NUMERIC(10, 2),
    seller_released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Constraints
    CONSTRAINT chk_reservations_status_valid 
        CHECK (status IN ('pending_payment', 'active', 'completed', 'cancelled', 'expired')),
    CONSTRAINT chk_reservations_transaction_type_valid
        CHECK (transaction_type IN ('purchase', 'lease')),
    CONSTRAINT chk_reservations_lease_amount_valid
        CHECK (
            (transaction_type = 'purchase' AND lease_amount IS NULL)
            OR (transaction_type = 'lease' AND lease_amount IS NOT NULL AND lease_amount >= 0)
        ),
    
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
CREATE UNIQUE INDEX uq_active_reservations_item ON reservations(item_id) WHERE status IN ('active', 'pending_payment');

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);