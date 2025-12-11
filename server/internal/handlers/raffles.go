package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"math/big"
	mathrand "math/rand"
	"net/http"
	"time"

	"secret-santa/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateRaffleRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatarUrl"` // URL уже загруженного аватара
	Budget      string `json:"budget"`
	EventDate   string `json:"eventDate"`
}

type RaffleResponse struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	AvatarURL   *string          `json:"avatarUrl"`
	InviteCode  string           `json:"inviteCode"`
	Budget      string           `json:"budget"`
	EventDate   *string          `json:"eventDate"`
	IsDrawn     bool             `json:"isDrawn"`
	IsOwner     bool             `json:"isOwner"`
	OwnerID     string           `json:"ownerId"`
	Members     []MemberResponse `json:"members"`
	CreatedAt   string           `json:"createdAt"`
}

type MemberResponse struct {
	ID              string  `json:"id"`
	UserID          string  `json:"userId"`
	Name            string  `json:"name"`
	AvatarURL       *string `json:"avatarUrl"`
	IsProfileFilled bool    `json:"isProfileFilled"`
}

// Профиль участника в розыгрыше (для обновления своего профиля)
type ParticipantProfileRequest struct {
	Phone          *string `json:"phone"`
	About          *string `json:"about"`
	AddressLine1   *string `json:"address_line1"`
	AddressLine2   *string `json:"address_line2"`
	City           *string `json:"city"`
	Region         *string `json:"region"`
	PostalCode     *string `json:"postal_code"`
	Country        *string `json:"country"`
	AddressLine1En *string `json:"address_line1_en"`
	AddressLine2En *string `json:"address_line2_en"`
	CityEn         *string `json:"city_en"`
	RegionEn       *string `json:"region_en"`
	Wishlist       *string `json:"wishlist"`
	AntiWishlist   *string `json:"anti_wishlist"`
}

// Полная информация о получателе подарка
type GifteeResponse struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	AvatarURL      *string `json:"avatarUrl"`
	Phone          *string `json:"phone"`
	About          *string `json:"about"`
	AddressLine1   *string `json:"address_line1"`
	AddressLine2   *string `json:"address_line2"`
	City           *string `json:"city"`
	Region         *string `json:"region"`
	PostalCode     *string `json:"postal_code"`
	Country        *string `json:"country"`
	AddressLine1En *string `json:"address_line1_en"`
	AddressLine2En *string `json:"address_line2_en"`
	CityEn         *string `json:"city_en"`
	RegionEn       *string `json:"region_en"`
	Wishlist       *string `json:"wishlist"`
	AntiWishlist   *string `json:"anti_wishlist"`
}

type AssignmentResponse struct {
	ReceiverID   string `json:"receiverId"`
	ReceiverName string `json:"receiverName"`
}

func (h *Handler) GetRaffles(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)

	var members []models.Member
	h.DB.Where("user_id = ?", uid).Find(&members)

	groupIDs := make([]uuid.UUID, len(members))
	for i, m := range members {
		groupIDs[i] = m.GroupID
	}

	var groups []models.Group
	if len(groupIDs) > 0 {
		h.DB.Preload("Members").Preload("Members.User").Where("id IN ?", groupIDs).Find(&groups)
	}

	response := make([]RaffleResponse, len(groups))
	for i, g := range groups {
		response[i] = h.raffleToResponse(g, uid)
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) CreateRaffle(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)

	var req CreateRaffleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate invite code
	inviteCode, _ := generateInviteCode()

	// Parse event date if provided
	var eventDate *time.Time
	if req.EventDate != "" {
		parsed, err := time.Parse("2006-01-02", req.EventDate)
		if err == nil {
			eventDate = &parsed
		}
	}

	var avatarURL *string
	if req.AvatarURL != "" {
		avatarURL = &req.AvatarURL
	}

	group := models.Group{
		Name:        req.Name,
		Description: req.Description,
		AvatarURL:   avatarURL,
		InviteCode:  inviteCode,
		Budget:      req.Budget,
		EventDate:   eventDate,
		OwnerID:     uid,
	}

	if err := h.DB.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
		return
	}

	// Add owner as member
	member := models.Member{
		GroupID: group.ID,
		UserID:  uid,
	}
	h.DB.Create(&member)

	// Reload with members
	h.DB.Preload("Members").Preload("Members.User").First(&group, group.ID)

	c.JSON(http.StatusCreated, h.raffleToResponse(group, uid))
}

func (h *Handler) GetRaffle(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)

	groupID := c.Param("id")
	gid, err := uuid.Parse(groupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	var group models.Group
	if err := h.DB.Preload("Members").Preload("Members.User").First(&group, gid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	// Check if user is member
	isMember := false
	for _, m := range group.Members {
		if m.UserID == uid {
			isMember = true
			break
		}
	}

	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this group"})
		return
	}

	c.JSON(http.StatusOK, h.raffleToResponse(group, uid))
}

func (h *Handler) DeleteRaffle(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)

	groupID := c.Param("id")
	gid, err := uuid.Parse(groupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	var group models.Group
	if err := h.DB.First(&group, gid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	if group.OwnerID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can delete the group"})
		return
	}

	// Delete assignments, members, then group
	h.DB.Where("group_id = ?", gid).Delete(&models.Assignment{})
	h.DB.Where("group_id = ?", gid).Delete(&models.Member{})
	h.DB.Delete(&group)

	c.JSON(http.StatusOK, gin.H{"message": "Group deleted"})
}

func (h *Handler) JoinRaffle(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)

	groupID := c.Param("id")

	// Try to find by ID or invite code
	var group models.Group
	if gid, err := uuid.Parse(groupID); err == nil {
		h.DB.First(&group, gid)
	}

	if group.ID == uuid.Nil {
		if err := h.DB.Where("invite_code = ?", groupID).First(&group).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
			return
		}
	}

	if group.IsDrawn {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot join, names already drawn"})
		return
	}

	// Check if already member
	var existingMember models.Member
	if err := h.DB.Where("group_id = ? AND user_id = ?", group.ID, uid).First(&existingMember).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "You are already a member"})
		return
	}

	// Копируем профиль из UserProfile (если есть)
	var userProfile models.UserProfile
	member := models.Member{
		GroupID: group.ID,
		UserID:  uid,
	}

	if err := h.DB.Where("user_id = ?", uid).First(&userProfile).Error; err == nil {
		// Копируем профиль в member
		member.Phone = userProfile.Phone
		member.About = userProfile.About
		member.AddressLine1 = userProfile.AddressLine1
		member.AddressLine2 = userProfile.AddressLine2
		member.City = userProfile.City
		member.Region = userProfile.Region
		member.PostalCode = userProfile.PostalCode
		member.Country = userProfile.Country
		member.AddressLine1En = userProfile.AddressLine1En
		member.AddressLine2En = userProfile.AddressLine2En
		member.CityEn = userProfile.CityEn
		member.RegionEn = userProfile.RegionEn
		member.Wishlist = userProfile.Wishlist
		member.AntiWishlist = userProfile.AntiWishlist
	}

	if err := h.DB.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join group"})
		return
	}

	// Reload group with members
	h.DB.Preload("Members").Preload("Members.User").First(&group, group.ID)

	c.JSON(http.StatusOK, h.raffleToResponse(group, uid))
}

func (h *Handler) DrawNames(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)

	groupID := c.Param("id")
	gid, err := uuid.Parse(groupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	var group models.Group
	if err := h.DB.Preload("Members").First(&group, gid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	if group.OwnerID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can draw names"})
		return
	}

	if group.IsDrawn {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Names already drawn"})
		return
	}

	if len(group.Members) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Need at least 3 members to draw"})
		return
	}

	// Check if all members have filled profiles
	for _, m := range group.Members {
		if !isProfileFilled(m) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "All participants must fill their profiles before drawing"})
			return
		}
	}

	// Load exclusions for this raffle
	var exclusions []models.Exclusion
	h.DB.Where("group_id = ?", gid).Find(&exclusions)

	// Build exclusion map (bidirectional)
	exclusionMap := make(map[uuid.UUID]map[uuid.UUID]bool)
	for _, excl := range exclusions {
		if exclusionMap[excl.ParticipantA] == nil {
			exclusionMap[excl.ParticipantA] = make(map[uuid.UUID]bool)
		}
		if exclusionMap[excl.ParticipantB] == nil {
			exclusionMap[excl.ParticipantB] = make(map[uuid.UUID]bool)
		}
		// Bidirectional exclusion
		exclusionMap[excl.ParticipantA][excl.ParticipantB] = true
		exclusionMap[excl.ParticipantB][excl.ParticipantA] = true
	}

	// Perform draw (derangement - no one gets themselves or excluded pairs)
	memberIDs := make([]uuid.UUID, len(group.Members))
	memberMap := make(map[uuid.UUID]*models.Member)
	for i, m := range group.Members {
		memberIDs[i] = m.ID
		memberMap[m.ID] = &group.Members[i]
	}

	assignments := derangementWithExclusions(memberIDs, exclusionMap)
	if assignments == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot find valid assignment with current exclusions. Try removing some exclusions."})
		return
	}

	// Save assignments to members
	for giverMemberID, gifteeMemberID := range assignments {
		giver := memberMap[giverMemberID]
		giver.GifteeID = &gifteeMemberID
		h.DB.Save(giver)

		// Also save to Assignment table for backward compatibility
		assignment := models.Assignment{
			GroupID:    gid,
			GiverID:    giver.UserID,
			ReceiverID: memberMap[gifteeMemberID].UserID,
		}
		h.DB.Create(&assignment)
	}

	// Mark as drawn
	group.IsDrawn = true
	h.DB.Save(&group)

	// Reload with members
	h.DB.Preload("Members").Preload("Members.User").First(&group, gid)

	c.JSON(http.StatusOK, h.raffleToResponse(group, uid))
}

func (h *Handler) GetMyAssignment(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)

	groupID := c.Param("id")
	gid, err := uuid.Parse(groupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	var assignment models.Assignment
	if err := h.DB.Preload("Receiver").Where("group_id = ? AND giver_id = ?", gid, uid).First(&assignment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No assignment found"})
		return
	}

	c.JSON(http.StatusOK, AssignmentResponse{
		ReceiverID:   assignment.ReceiverID.String(),
		ReceiverName: assignment.Receiver.Name,
	})
}

// isProfileFilled проверяет, заполнен ли профиль участника
func isProfileFilled(m models.Member) bool {
	// Считаем профиль заполненным, если есть хотя бы одно из ключевых полей
	hasAddress := m.AddressLine1 != nil && *m.AddressLine1 != "" &&
		m.City != nil && *m.City != "" &&
		m.Country != nil && *m.Country != ""
	hasWishlist := m.Wishlist != nil && *m.Wishlist != ""

	return hasAddress || hasWishlist
}

func (h *Handler) raffleToResponse(g models.Group, currentUserID uuid.UUID) RaffleResponse {
	members := make([]MemberResponse, len(g.Members))
	for i, m := range g.Members {
		members[i] = MemberResponse{
			ID:              m.ID.String(),
			UserID:          m.UserID.String(),
			Name:            m.User.Name,
			AvatarURL:       m.User.AvatarURL,
			IsProfileFilled: isProfileFilled(m),
		}
	}

	var eventDate *string
	if g.EventDate != nil {
		formatted := g.EventDate.Format("2006-01-02")
		eventDate = &formatted
	}

	return RaffleResponse{
		ID:          g.ID.String(),
		Name:        g.Name,
		Description: g.Description,
		AvatarURL:   g.AvatarURL,
		InviteCode:  g.InviteCode,
		Budget:      g.Budget,
		EventDate:   eventDate,
		IsDrawn:     g.IsDrawn,
		IsOwner:     g.OwnerID == currentUserID,
		OwnerID:     g.OwnerID.String(),
		Members:     members,
		CreatedAt:   g.CreatedAt.Format(time.RFC3339),
	}
}

// UpdateMyProfile - обновить профиль участника в конкретном розыгрыше
func (h *Handler) UpdateMyProfile(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)
	raffleID := c.Param("id")
	rid, err := uuid.Parse(raffleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid raffle ID"})
		return
	}

	var req ParticipantProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Найти участника
	var member models.Member
	if err := h.DB.Where("group_id = ? AND user_id = ?", rid, uid).First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not a member of this raffle"})
		return
	}

	// Обновить профиль
	member.Phone = req.Phone
	member.About = req.About
	member.AddressLine1 = req.AddressLine1
	member.AddressLine2 = req.AddressLine2
	member.City = req.City
	member.Region = req.Region
	member.PostalCode = req.PostalCode
	member.Country = req.Country
	member.AddressLine1En = req.AddressLine1En
	member.AddressLine2En = req.AddressLine2En
	member.CityEn = req.CityEn
	member.RegionEn = req.RegionEn
	member.Wishlist = req.Wishlist
	member.AntiWishlist = req.AntiWishlist

	if err := h.DB.Save(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated"})
}

// GetMyGiftee - получить информацию о моем получателе (после жеребьевки)
func (h *Handler) GetMyGiftee(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)
	raffleID := c.Param("id")
	rid, err := uuid.Parse(raffleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid raffle ID"})
		return
	}

	// Проверить что розыгрыш проведен
	var group models.Group
	if err := h.DB.First(&group, rid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Raffle not found"})
		return
	}

	if !group.IsDrawn {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Draw not yet conducted"})
		return
	}

	// Найти участника
	var member models.Member
	if err := h.DB.Where("group_id = ? AND user_id = ?", rid, uid).First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not a member of this raffle"})
		return
	}

	// Проверить что есть получатель
	if member.GifteeID == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No giftee assigned"})
		return
	}

	// Загрузить получателя с его User
	var giftee models.Member
	if err := h.DB.Preload("User").First(&giftee, *member.GifteeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Giftee not found"})
		return
	}

	response := GifteeResponse{
		ID:             giftee.ID.String(),
		Name:           giftee.User.Name,
		AvatarURL:      giftee.User.AvatarURL,
		Phone:          giftee.Phone,
		About:          giftee.About,
		AddressLine1:   giftee.AddressLine1,
		AddressLine2:   giftee.AddressLine2,
		City:           giftee.City,
		Region:         giftee.Region,
		PostalCode:     giftee.PostalCode,
		Country:        giftee.Country,
		AddressLine1En: giftee.AddressLine1En,
		AddressLine2En: giftee.AddressLine2En,
		CityEn:         giftee.CityEn,
		RegionEn:       giftee.RegionEn,
		Wishlist:       giftee.Wishlist,
		AntiWishlist:   giftee.AntiWishlist,
	}

	c.JSON(http.StatusOK, response)
}

func generateInviteCode() (string, error) {
	bytes := make([]byte, 4)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// derangement creates a random derangement (permutation where no element appears in its original position)
// derangementWithExclusions - creates a derangement considering exclusions
// Returns nil if no valid assignment exists
func derangementWithExclusions(ids []uuid.UUID, exclusions map[uuid.UUID]map[uuid.UUID]bool) map[uuid.UUID]uuid.UUID {
	n := len(ids)
	result := make(map[uuid.UUID]uuid.UUID)
	maxAttempts := 10000 // Prevent infinite loop

	// Fisher-Yates with rejection for derangement with exclusions
	for attempt := 0; attempt < maxAttempts; attempt++ {
		shuffled := make([]uuid.UUID, n)
		copy(shuffled, ids)

		// Shuffle
		r := mathrand.New(mathrand.NewSource(time.Now().UnixNano() + cryptoRandInt64()))
		for i := n - 1; i > 0; i-- {
			j := r.Intn(i + 1)
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		}

		// Check if it's a valid derangement with exclusions
		isValid := true
		for i := 0; i < n; i++ {
			giver := ids[i]
			receiver := shuffled[i]

			// Cannot give to self
			if giver == receiver {
				isValid = false
				break
			}

			// Cannot give to excluded participant
			if exclusions[giver] != nil && exclusions[giver][receiver] {
				isValid = false
				break
			}
		}

		if isValid {
			for i := 0; i < n; i++ {
				result[ids[i]] = shuffled[i]
			}
			return result
		}
	}

	// No valid assignment found after max attempts
	return nil
}

func derangement(ids []uuid.UUID) map[uuid.UUID]uuid.UUID {
	n := len(ids)
	result := make(map[uuid.UUID]uuid.UUID)

	// Fisher-Yates with rejection for derangement
	for {
		shuffled := make([]uuid.UUID, n)
		copy(shuffled, ids)

		// Shuffle
		r := mathrand.New(mathrand.NewSource(time.Now().UnixNano() + cryptoRandInt64()))
		for i := n - 1; i > 0; i-- {
			j := r.Intn(i + 1)
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		}

		// Check if it's a derangement
		isDerangement := true
		for i := 0; i < n; i++ {
			if ids[i] == shuffled[i] {
				isDerangement = false
				break
			}
		}

		if isDerangement {
			for i := 0; i < n; i++ {
				result[ids[i]] = shuffled[i]
			}
			return result
		}
	}
}

func cryptoRandInt64() int64 {
	n, _ := rand.Int(rand.Reader, big.NewInt(1<<62))
	return n.Int64()
}
