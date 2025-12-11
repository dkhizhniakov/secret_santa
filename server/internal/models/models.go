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

// UserProfile - дефолтный профиль пользователя для переиспользования в розыгрышах
type UserProfile struct {
	ID     uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	User   User      `gorm:"foreignKey:UserID" json:"-"`
	Phone  *string   `json:"phone"`
	About  *string   `gorm:"type:text" json:"about"`

	// Адрес на местном языке
	AddressLine1 *string `json:"address_line1"`
	AddressLine2 *string `json:"address_line2"`
	City         *string `json:"city"`
	Region       *string `json:"region"` // Область/регион/штат
	PostalCode   *string `json:"postal_code"`
	Country      *string `json:"country"`

	// Адрес на английском (автозаполняемый)
	AddressLine1En *string `json:"address_line1_en"`
	AddressLine2En *string `json:"address_line2_en"`
	CityEn         *string `json:"city_en"`
	RegionEn       *string `json:"region_en"`

	Wishlist     *string   `gorm:"type:text" json:"wishlist"`      // Что хочу получить
	AntiWishlist *string   `gorm:"type:text" json:"anti_wishlist"` // Аллергии, что не дарить
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Group (будет заменено на Raffle позже)
type Group struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `gorm:"not null"`
	Description string
	AvatarURL   *string // URL аватара розыгрыша
	InviteCode  string  `gorm:"uniqueIndex;not null"`
	Budget      string
	EventDate   *time.Time
	OwnerID     uuid.UUID `gorm:"type:uuid;not null"`
	Owner       User      `gorm:"foreignKey:OwnerID"`
	IsDrawn     bool      `gorm:"default:false"`
	Members     []Member
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Member (Participant) - участник конкретного розыгрыша
type Member struct {
	ID      uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	GroupID uuid.UUID `gorm:"type:uuid;not null"`
	Group   Group     `gorm:"foreignKey:GroupID"`
	UserID  uuid.UUID `gorm:"type:uuid;not null"`
	User    User      `gorm:"foreignKey:UserID"`

	// Профиль участника в этом розыгрыше (копируется из UserProfile при вступлении)
	Phone *string `json:"phone"`
	About *string `gorm:"type:text" json:"about"`

	// Адрес на местном языке
	AddressLine1 *string `json:"address_line1"`
	AddressLine2 *string `json:"address_line2"`
	City         *string `json:"city"`
	Region       *string `json:"region"`
	PostalCode   *string `json:"postal_code"`
	Country      *string `json:"country"`

	// Адрес на английском
	AddressLine1En *string `json:"address_line1_en"`
	AddressLine2En *string `json:"address_line2_en"`
	CityEn         *string `json:"city_en"`
	RegionEn       *string `json:"region_en"`

	Wishlist     *string `gorm:"type:text" json:"wishlist"`
	AntiWishlist *string `gorm:"type:text" json:"anti_wishlist"`

	// Кому дарит (заполняется после жеребьевки)
	GifteeID *uuid.UUID `gorm:"type:uuid" json:"giftee_id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Exclusion - ограничение между участниками розыгрыша (кто не должен дарить кому)
type Exclusion struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	GroupID      uuid.UUID `gorm:"type:uuid;not null;index:idx_group_exclusion" json:"group_id"`
	Group        Group     `gorm:"foreignKey:GroupID" json:"-"`
	ParticipantA uuid.UUID `gorm:"type:uuid;not null" json:"participant_a_id"` // A не может дарить B
	ParticipantB uuid.UUID `gorm:"type:uuid;not null" json:"participant_b_id"` // B не может дарить A (двусторонне)
	MemberA      Member    `gorm:"foreignKey:ParticipantA" json:"-"`
	MemberB      Member    `gorm:"foreignKey:ParticipantB" json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
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

// Message - сообщение в анонимном чате между дарителем и получателем
type Message struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	GroupID   uuid.UUID  `gorm:"type:uuid;not null;index:idx_group_chat" json:"group_id"`
	SantaID   uuid.UUID  `gorm:"type:uuid;not null;index:idx_santa_chat" json:"santa_id"`   // Member ID дарителя
	GifteeID  uuid.UUID  `gorm:"type:uuid;not null;index:idx_giftee_chat" json:"giftee_id"` // Member ID получателя
	FromSanta bool       `gorm:"not null" json:"from_santa"` // true = от дарителя, false = от получателя
	Content   string     `gorm:"type:text;not null" json:"content"`
	ReadAt    *time.Time `json:"read_at"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}
