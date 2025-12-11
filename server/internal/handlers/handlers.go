package handlers

import (
	"secret-santa/internal/config"
	"secret-santa/internal/storage"

	"gorm.io/gorm"
)

type Handler struct {
	DB            *gorm.DB
	cfg           *config.Config
	storage       *storage.S3Storage
	Hub           *Hub
	encryptionKey []byte
}

func New(db *gorm.DB, cfg *config.Config, s3 *storage.S3Storage, hub *Hub) *Handler {
	return &Handler{
		DB:            db,
		cfg:           cfg,
		storage:       s3,
		Hub:           hub,
		encryptionKey: cfg.EncryptionKey,
	}
}
