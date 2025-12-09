package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Email     string    `gorm:"uniqueIndex;not null"`
	Password  string    `gorm:"not null"`
	Name      string    `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Group struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `gorm:"not null"`
	Description string
	InviteCode  string    `gorm:"uniqueIndex;not null"`
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
	GiverID    uuid.UUID `gorm:"type:uuid;not null"` // Кто дарит
	ReceiverID uuid.UUID `gorm:"type:uuid;not null"` // Кому дарит
	Giver      User      `gorm:"foreignKey:GiverID"`
	Receiver   User      `gorm:"foreignKey:ReceiverID"`
	CreatedAt  time.Time
}

