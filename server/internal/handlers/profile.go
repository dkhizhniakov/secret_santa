package handlers

import (
	"net/http"

	"secret-santa/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ProfileRequest - структура для обновления профиля
type ProfileRequest struct {
	Phone          *string `json:"phone"`
	About          *string `json:"about"`
	
	// Адрес на местном языке
	AddressLine1   *string `json:"address_line1"`
	AddressLine2   *string `json:"address_line2"`
	City           *string `json:"city"`
	Region         *string `json:"region"`
	PostalCode     *string `json:"postal_code"`
	Country        *string `json:"country"`
	
	// Адрес на английском
	AddressLine1En *string `json:"address_line1_en"`
	AddressLine2En *string `json:"address_line2_en"`
	CityEn         *string `json:"city_en"`
	RegionEn       *string `json:"region_en"`
	
	Wishlist       *string `json:"wishlist"`
	AntiWishlist   *string `json:"anti_wishlist"`
}

// ProfileResponse - структура ответа с профилем
type ProfileResponse struct {
	ID             uuid.UUID `json:"id"`
	UserID         uuid.UUID `json:"user_id"`
	Phone          *string   `json:"phone"`
	About          *string   `json:"about"`
	
	// Адрес на местном языке
	AddressLine1   *string   `json:"address_line1"`
	AddressLine2   *string   `json:"address_line2"`
	City           *string   `json:"city"`
	Region         *string   `json:"region"`
	PostalCode     *string   `json:"postal_code"`
	Country        *string   `json:"country"`
	
	// Адрес на английском
	AddressLine1En *string   `json:"address_line1_en"`
	AddressLine2En *string   `json:"address_line2_en"`
	CityEn         *string   `json:"city_en"`
	RegionEn       *string   `json:"region_en"`
	
	Wishlist       *string   `json:"wishlist"`
	AntiWishlist   *string   `json:"anti_wishlist"`
}

// GetProfile - получить профиль текущего пользователя
func (h *Handler) GetProfile(c *gin.Context) {
	userID := c.GetString("userID")

	var profile models.UserProfile
	result := h.db.Where("user_id = ?", userID).First(&profile)

	// Если профиль не найден, возвращаем пустой профиль
	if result.Error != nil {
		c.JSON(http.StatusOK, ProfileResponse{
			UserID: uuid.MustParse(userID),
		})
		return
	}

	c.JSON(http.StatusOK, ProfileResponse{
		ID:             profile.ID,
		UserID:         profile.UserID,
		Phone:          profile.Phone,
		About:          profile.About,
		AddressLine1:   profile.AddressLine1,
		AddressLine2:   profile.AddressLine2,
		City:           profile.City,
		Region:         profile.Region,
		PostalCode:     profile.PostalCode,
		Country:        profile.Country,
		AddressLine1En: profile.AddressLine1En,
		AddressLine2En: profile.AddressLine2En,
		CityEn:         profile.CityEn,
		RegionEn:       profile.RegionEn,
		Wishlist:       profile.Wishlist,
		AntiWishlist:   profile.AntiWishlist,
	})
}

// UpdateProfile - обновить или создать профиль
func (h *Handler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("userID")

	var req ProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var profile models.UserProfile
	result := h.db.Where("user_id = ?", userID).First(&profile)

	if result.Error != nil {
		// Профиль не существует - создаем новый
		profile = models.UserProfile{
			UserID:         uuid.MustParse(userID),
			Phone:          req.Phone,
			About:          req.About,
			AddressLine1:   req.AddressLine1,
			AddressLine2:   req.AddressLine2,
			City:           req.City,
			Region:         req.Region,
			PostalCode:     req.PostalCode,
			Country:        req.Country,
			AddressLine1En: req.AddressLine1En,
			AddressLine2En: req.AddressLine2En,
			CityEn:         req.CityEn,
			RegionEn:       req.RegionEn,
			Wishlist:       req.Wishlist,
			AntiWishlist:   req.AntiWishlist,
		}
		if err := h.db.Create(&profile).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create profile"})
			return
		}
	} else {
		// Профиль существует - обновляем
		profile.Phone = req.Phone
		profile.About = req.About
		profile.AddressLine1 = req.AddressLine1
		profile.AddressLine2 = req.AddressLine2
		profile.City = req.City
		profile.Region = req.Region
		profile.PostalCode = req.PostalCode
		profile.Country = req.Country
		profile.AddressLine1En = req.AddressLine1En
		profile.AddressLine2En = req.AddressLine2En
		profile.CityEn = req.CityEn
		profile.RegionEn = req.RegionEn
		profile.Wishlist = req.Wishlist
		profile.AntiWishlist = req.AntiWishlist

		if err := h.db.Save(&profile).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
			return
		}
	}

	c.JSON(http.StatusOK, ProfileResponse{
		ID:             profile.ID,
		UserID:         profile.UserID,
		Phone:          profile.Phone,
		About:          profile.About,
		AddressLine1:   profile.AddressLine1,
		AddressLine2:   profile.AddressLine2,
		City:           profile.City,
		Region:         profile.Region,
		PostalCode:     profile.PostalCode,
		Country:        profile.Country,
		AddressLine1En: profile.AddressLine1En,
		AddressLine2En: profile.AddressLine2En,
		CityEn:         profile.CityEn,
		RegionEn:       profile.RegionEn,
		Wishlist:       profile.Wishlist,
		AntiWishlist:   profile.AntiWishlist,
	})
}

