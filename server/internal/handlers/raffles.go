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
	ID        string  `json:"id"`
	UserID    string  `json:"userId"`
	Name      string  `json:"name"`
	AvatarURL *string `json:"avatarUrl"`
}

type AssignmentResponse struct {
	ReceiverID   string `json:"receiverId"`
	ReceiverName string `json:"receiverName"`
}

func (h *Handler) GetRaffles(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)

	var members []models.Member
	h.db.Where("user_id = ?", uid).Find(&members)

	groupIDs := make([]uuid.UUID, len(members))
	for i, m := range members {
		groupIDs[i] = m.GroupID
	}

	var groups []models.Group
	if len(groupIDs) > 0 {
		h.db.Preload("Members").Preload("Members.User").Where("id IN ?", groupIDs).Find(&groups)
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

	if err := h.db.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
		return
	}

	// Add owner as member
	member := models.Member{
		GroupID: group.ID,
		UserID:  uid,
	}
	h.db.Create(&member)

	// Reload with members
	h.db.Preload("Members").Preload("Members.User").First(&group, group.ID)

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
	if err := h.db.Preload("Members").Preload("Members.User").First(&group, gid).Error; err != nil {
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
	if err := h.db.First(&group, gid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	if group.OwnerID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can delete the group"})
		return
	}

	// Delete assignments, members, then group
	h.db.Where("group_id = ?", gid).Delete(&models.Assignment{})
	h.db.Where("group_id = ?", gid).Delete(&models.Member{})
	h.db.Delete(&group)

	c.JSON(http.StatusOK, gin.H{"message": "Group deleted"})
}

func (h *Handler) JoinRaffle(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)

	groupID := c.Param("id")

	// Try to find by ID or invite code
	var group models.Group
	if gid, err := uuid.Parse(groupID); err == nil {
		h.db.First(&group, gid)
	}

	if group.ID == uuid.Nil {
		if err := h.db.Where("invite_code = ?", groupID).First(&group).Error; err != nil {
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
	if err := h.db.Where("group_id = ? AND user_id = ?", group.ID, uid).First(&existingMember).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "You are already a member"})
		return
	}

	member := models.Member{
		GroupID: group.ID,
		UserID:  uid,
	}

	if err := h.db.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join group"})
		return
	}

	// Reload group with members
	h.db.Preload("Members").Preload("Members.User").First(&group, group.ID)

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
	if err := h.db.Preload("Members").First(&group, gid).Error; err != nil {
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

	// Perform draw (derangement - no one gets themselves)
	memberIDs := make([]uuid.UUID, len(group.Members))
	for i, m := range group.Members {
		memberIDs[i] = m.UserID
	}

	assignments := derangement(memberIDs)

	// Save assignments
	for giverID, receiverID := range assignments {
		assignment := models.Assignment{
			GroupID:    gid,
			GiverID:    giverID,
			ReceiverID: receiverID,
		}
		h.db.Create(&assignment)
	}

	// Mark as drawn
	group.IsDrawn = true
	h.db.Save(&group)

	// Reload with members
	h.db.Preload("Members").Preload("Members.User").First(&group, gid)

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
	if err := h.db.Preload("Receiver").Where("group_id = ? AND giver_id = ?", gid, uid).First(&assignment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No assignment found"})
		return
	}

	c.JSON(http.StatusOK, AssignmentResponse{
		ReceiverID:   assignment.ReceiverID.String(),
		ReceiverName: assignment.Receiver.Name,
	})
}

func (h *Handler) raffleToResponse(g models.Group, currentUserID uuid.UUID) RaffleResponse {
	members := make([]MemberResponse, len(g.Members))
	for i, m := range g.Members {
		members[i] = MemberResponse{
			ID:        m.ID.String(),
			UserID:    m.UserID.String(),
			Name:      m.User.Name,
			AvatarURL: m.User.AvatarURL,
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

func generateInviteCode() (string, error) {
	bytes := make([]byte, 4)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// derangement creates a random derangement (permutation where no element appears in its original position)
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
