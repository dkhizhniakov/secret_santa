package models

import (
	"time"

	"github.com/google/uuid"
)

// User - пользователь системы (авторизация только через Google/Telegram)
type User struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	GoogleID   *string   `gorm:"uniqueIndex" json:"-"`
	TelegramID *int64    `gorm:"uniqueIndex" json:"-"`
	Name       string    `gorm:"not null" json:"name"`
	AvatarURL  *string   `json:"avatar_url"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Group (будет заменено на Raffle позже)
type Group struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `gorm:"not null"`
	Description string
	AvatarURL   *string   // URL аватара розыгрыша
	InviteCode  string `gorm:"uniqueIndex;not null"`
	Budget      string
	EventDate   *time.Time
	OwnerID     uuid.UUID `gorm:"type:uuid;not null"`
	Owner       User      `gorm:"foreignKey:OwnerID"`
	IsDrawn     bool      `gorm:"default:false"`
	Members     []Member
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Member struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	GroupID   uuid.UUID `gorm:"type:uuid;not null"`
	Group     Group     `gorm:"foreignKey:GroupID"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	User      User      `gorm:"foreignKey:UserID"`
	CreatedAt time.Time
}

type Assignment struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	GroupID    uuid.UUID `gorm:"type:uuid;not null"`
	GiverID    uuid.UUID `gorm:"type:uuid;not null"`
	ReceiverID uuid.UUID `gorm:"type:uuid;not null"`
	Giver      User      `gorm:"foreignKey:GiverID"`
	Receiver   User      `gorm:"foreignKey:ReceiverID"`
	CreatedAt  time.Time
}
