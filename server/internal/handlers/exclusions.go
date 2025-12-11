package handlers

import (
	"net/http"

	"secret-santa/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ExclusionRequest - запрос на создание исключения
type ExclusionRequest struct {
	ParticipantA uuid.UUID `json:"participant_a_id" binding:"required"`
	ParticipantB uuid.UUID `json:"participant_b_id" binding:"required"`
}

// ExclusionResponse - ответ с информацией об исключении
type ExclusionResponse struct {
	ID           uuid.UUID       `json:"id"`
	GroupID      uuid.UUID       `json:"group_id"`
	ParticipantA ParticipantInfo `json:"participant_a"`
	ParticipantB ParticipantInfo `json:"participant_b"`
	CreatedAt    string          `json:"created_at"`
}

type ParticipantInfo struct {
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`
	Name   string    `json:"name"`
	Avatar *string   `json:"avatar_url"`
}

// GetExclusions - получить все исключения для розыгрыша
func (h *Handler) GetExclusions(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)
	raffleID := c.Param("id")
	rid, err := uuid.Parse(raffleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid raffle ID"})
		return
	}

	// Проверяем, что пользователь - создатель розыгрыша
	var group models.Group
	if err := h.DB.Where("id = ?", rid).First(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Raffle not found"})
		return
	}

	if group.OwnerID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only raffle owner can manage exclusions"})
		return
	}

	// Получаем все исключения
	var exclusions []models.Exclusion
	if err := h.DB.Where("group_id = ?", rid).
		Preload("MemberA").
		Preload("MemberA.User").
		Preload("MemberB").
		Preload("MemberB.User").
		Find(&exclusions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch exclusions"})
		return
	}

	// Преобразуем в ответ
	response := make([]ExclusionResponse, len(exclusions))
	for i, excl := range exclusions {
		response[i] = ExclusionResponse{
			ID:      excl.ID,
			GroupID: excl.GroupID,
			ParticipantA: ParticipantInfo{
				ID:     excl.MemberA.ID,
				UserID: excl.MemberA.UserID,
				Name:   excl.MemberA.User.Name,
				Avatar: excl.MemberA.User.AvatarURL,
			},
			ParticipantB: ParticipantInfo{
				ID:     excl.MemberB.ID,
				UserID: excl.MemberB.UserID,
				Name:   excl.MemberB.User.Name,
				Avatar: excl.MemberB.User.AvatarURL,
			},
			CreatedAt: excl.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	c.JSON(http.StatusOK, response)
}

// CreateExclusion - создать новое исключение
func (h *Handler) CreateExclusion(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)
	raffleID := c.Param("id")
	rid, err := uuid.Parse(raffleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid raffle ID"})
		return
	}

	// Проверяем, что пользователь - создатель розыгрыша
	var group models.Group
	if err := h.DB.Where("id = ?", rid).First(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Raffle not found"})
		return
	}

	if group.OwnerID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only raffle owner can manage exclusions"})
		return
	}

	// Проверяем, что жеребьевка еще не проведена
	if group.IsDrawn {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot modify exclusions after draw"})
		return
	}

	var req ExclusionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем, что участники не одинаковые
	if req.ParticipantA == req.ParticipantB {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot create exclusion with same participant"})
		return
	}

	// Проверяем, что оба участника есть в розыгрыше
	var countA, countB int64
	h.DB.Model(&models.Member{}).Where("id = ? AND group_id = ?", req.ParticipantA, rid).Count(&countA)
	h.DB.Model(&models.Member{}).Where("id = ? AND group_id = ?", req.ParticipantB, rid).Count(&countB)

	if countA == 0 || countB == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "One or both participants not found in this raffle"})
		return
	}

	// Проверяем, что такое исключение еще не существует
	var existingCount int64
	h.DB.Model(&models.Exclusion{}).Where(
		"group_id = ? AND ((participant_a = ? AND participant_b = ?) OR (participant_a = ? AND participant_b = ?))",
		rid, req.ParticipantA, req.ParticipantB, req.ParticipantB, req.ParticipantA,
	).Count(&existingCount)

	if existingCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Exclusion already exists"})
		return
	}

	// Создаем исключение
	exclusion := models.Exclusion{
		GroupID:      rid,
		ParticipantA: req.ParticipantA,
		ParticipantB: req.ParticipantB,
	}

	if err := h.DB.Create(&exclusion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create exclusion"})
		return
	}

	// Загружаем полные данные для ответа
	h.DB.Preload("MemberA").Preload("MemberA.User").Preload("MemberB").Preload("MemberB.User").First(&exclusion, exclusion.ID)

	response := ExclusionResponse{
		ID:      exclusion.ID,
		GroupID: exclusion.GroupID,
		ParticipantA: ParticipantInfo{
			ID:     exclusion.MemberA.ID,
			UserID: exclusion.MemberA.UserID,
			Name:   exclusion.MemberA.User.Name,
			Avatar: exclusion.MemberA.User.AvatarURL,
		},
		ParticipantB: ParticipantInfo{
			ID:     exclusion.MemberB.ID,
			UserID: exclusion.MemberB.UserID,
			Name:   exclusion.MemberB.User.Name,
			Avatar: exclusion.MemberB.User.AvatarURL,
		},
		CreatedAt: exclusion.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	c.JSON(http.StatusCreated, response)
}

// DeleteExclusion - удалить исключение
func (h *Handler) DeleteExclusion(c *gin.Context) {
	userID := c.GetString("userID")
	uid, _ := uuid.Parse(userID)
	raffleID := c.Param("id")
	rid, err := uuid.Parse(raffleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid raffle ID"})
		return
	}

	exclusionID := c.Param("exclusionId")
	eid, err := uuid.Parse(exclusionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exclusion ID"})
		return
	}

	// Проверяем, что пользователь - создатель розыгрыша
	var group models.Group
	if err := h.DB.Where("id = ?", rid).First(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Raffle not found"})
		return
	}

	if group.OwnerID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only raffle owner can manage exclusions"})
		return
	}

	// Проверяем, что жеребьевка еще не проведена
	if group.IsDrawn {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot modify exclusions after draw"})
		return
	}

	// Удаляем исключение
	result := h.DB.Where("id = ? AND group_id = ?", eid, rid).Delete(&models.Exclusion{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete exclusion"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exclusion not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Exclusion deleted"})
}
