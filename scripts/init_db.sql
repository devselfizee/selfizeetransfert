-- ==============================================================================
-- Selfizee Transfer - Initialisation de la base de données
-- ==============================================================================

-- Activation de l'extension uuid-ossp pour la génération d'UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- Table des utilisateurs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    storage_quota_bytes BIGINT NOT NULL DEFAULT 10737418240,  -- 10 Go par défaut
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Table des transferts
-- ==============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_email VARCHAR(255) NOT NULL,
    recipient_emails TEXT[] NOT NULL,
    message TEXT,
    download_link VARCHAR(255) NOT NULL UNIQUE,
    download_password_hash VARCHAR(255),
    total_size_bytes BIGINT NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    max_downloads INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Table des fichiers
-- ==============================================================================
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    original_name VARCHAR(500) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(255) NOT NULL DEFAULT 'application/octet-stream',
    size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64),
    storage_path VARCHAR(1000) NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Index pour les performances
-- ==============================================================================

-- Index sur l'email des utilisateurs (recherche rapide)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index sur le lien de téléchargement (accès fréquent)
CREATE INDEX IF NOT EXISTS idx_transfers_download_link ON transfers(download_link);

-- Index sur l'expiration des transferts (nettoyage automatique)
CREATE INDEX IF NOT EXISTS idx_transfers_expires_at ON transfers(expires_at);

-- Index sur l'expéditeur des transferts
CREATE INDEX IF NOT EXISTS idx_transfers_sender_id ON transfers(sender_id);

-- Index sur le statut actif des transferts
CREATE INDEX IF NOT EXISTS idx_transfers_is_active ON transfers(is_active);

-- Index sur le transfert associé aux fichiers
CREATE INDEX IF NOT EXISTS idx_files_transfer_id ON files(transfer_id);

-- Index composite pour les transferts actifs non expirés
CREATE INDEX IF NOT EXISTS idx_transfers_active_expires
    ON transfers(is_active, expires_at)
    WHERE is_active = true;

-- ==============================================================================
-- Utilisateur administrateur par défaut
-- ==============================================================================
-- Mot de passe : Admin123!
-- Hash bcrypt généré pour "Admin123!"
INSERT INTO users (email, password_hash, first_name, last_name, is_active, is_admin)
VALUES (
    'admin@selfizee.fr',
    '$2b$12$kniDCLJz4m1AegZt7n5ytOLOKg3pkoW6kXxu0fA5rvKcNGxAxkfYu',
    'Admin',
    'Selfizee',
    true,
    true
)
ON CONFLICT (email) DO NOTHING;
