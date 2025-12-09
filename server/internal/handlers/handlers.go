package handlers

import (
	"secret-santa/internal/config"
	"secret-santa/internal/storage"

	"gorm.io/gorm"
)

type Handler struct {
	db      *gorm.DB
	cfg     *config.Config
	storage *storage.S3Storage
}

func New(db *gorm.DB, cfg *config.Config, s3 *storage.S3Storage) *Handler {
	return &Handler{db: db, cfg: cfg, storage: s3}
}
