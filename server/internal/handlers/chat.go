package handlers

import (
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"secret-santa/internal/crypto"
	"secret-santa/internal/models"
)

// validateToken проверяет JWT токен и возвращает user_id
func (h *Handler) validateToken(tokenString string) (uuid.UUID, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(h.cfg.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return uuid.Nil, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, errors.New("invalid token claims")
	}

	userIDStr, ok := claims["sub"].(string)
	if !ok {
		return uuid.Nil, errors.New("invalid user ID in token")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, errors.New("invalid user ID format")
	}

	return userID, nil
}

// HandleWebSocket обрабатывает WebSocket подключения для чата
func (h *Handler) HandleWebSocket(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid raffle ID"})
		return
	}

	// Получаем токен из query параметра (WebSocket не поддерживает кастомные заголовки)
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
		return
	}

	// Валидируем токен и получаем user_id
	userID, err := h.validateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	// Проверяем, что пользователь является участником розыгрыша
	var member models.Member
	if err := h.DB.First(&member, "group_id = ? AND user_id = ?", groupID, userID).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this raffle"})
		return
	}

	// Проверяем, что жеребьевка проведена
	var group models.Group
	if err := h.DB.First(&group, "id = ?", groupID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Raffle not found"})
		return
	}

	if !group.IsDrawn {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Draw has not been performed yet"})
		return
	}

	// Апгрейдим HTTP соединение до WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	// Создаем клиента
	client := &Client{
		hub:      h.Hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		userID:   userID,
		memberID: member.ID,
		groupID:  groupID,
	}

	// Регистрируем клиента в Hub
	h.Hub.register <- client

	// Запускаем горутины для чтения и записи
	go client.writePump()
	go client.readPump()
}

// GetChatWithGiftee возвращает историю сообщений с получателем (я - даритель)
func (h *Handler) GetChatWithGiftee(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid raffle ID"})
		return
	}

	userID, _ := c.Get("user_id")

	// Получаем участника
	var member models.Member
	if err := h.DB.First(&member, "group_id = ? AND user_id = ?", groupID, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not a member of this raffle"})
		return
	}

	// Проверяем, что жеребьевка проведена
	if member.GifteeID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Draw has not been performed yet"})
		return
	}

	// Получаем все сообщения между мной (santa) и моим получателем (giftee)
	var messages []models.Message
	if err := h.DB.Where("group_id = ? AND santa_id = ? AND giftee_id = ?",
		groupID, member.ID, *member.GifteeID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	// Помечаем все непрочитанные сообщения от получателя как прочитанные
	now := time.Now()
	h.DB.Model(&models.Message{}).
		Where("group_id = ? AND santa_id = ? AND giftee_id = ? AND from_santa = false AND read_at IS NULL",
			groupID, member.ID, *member.GifteeID).
		Update("read_at", now)

	// Расшифровываем и преобразуем в DTO
	chatMessages := make([]gin.H, len(messages))
	for i, msg := range messages {
		// Расшифровываем содержимое
		decryptedContent, err := crypto.Decrypt(msg.Content, h.encryptionKey)
		if err != nil {
			log.Printf("Failed to decrypt message %s: %v", msg.ID, err)
			decryptedContent = "[Encrypted message]" // Fallback на случай ошибки
		}
		msg.Content = decryptedContent
		chatMessages[i] = gin.H{
			"id":         msg.ID,
			"santa_id":   msg.SantaID,
			"giftee_id":  msg.GifteeID,
			"from_santa": msg.FromSanta,
			"content":    msg.Content,
			"read_at":    msg.ReadAt,
			"created_at": msg.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, chatMessages)
}

// GetChatWithSanta возвращает историю сообщений с дарителем (я - получатель)
func (h *Handler) GetChatWithSanta(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid raffle ID"})
		return
	}

	userID, _ := c.Get("user_id")

	// Получаем участника (я - получатель)
	var member models.Member
	if err := h.DB.First(&member, "group_id = ? AND user_id = ?", groupID, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not a member of this raffle"})
		return
	}

	// Находим моего дарителя
	var santa models.Member
	if err := h.DB.First(&santa, "group_id = ? AND giftee_id = ?", groupID, member.ID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Draw has not been performed yet or you don't have a santa"})
		return
	}

	// Получаем все сообщения между моим дарителем и мной
	var messages []models.Message
	if err := h.DB.Where("group_id = ? AND santa_id = ? AND giftee_id = ?",
		groupID, santa.ID, member.ID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	// Помечаем все непрочитанные сообщения от дарителя как прочитанные
	now := time.Now()
	h.DB.Model(&models.Message{}).
		Where("group_id = ? AND santa_id = ? AND giftee_id = ? AND from_santa = true AND read_at IS NULL",
			groupID, santa.ID, member.ID).
		Update("read_at", now)

	// Расшифровываем и преобразуем в DTO
	chatMessages := make([]gin.H, len(messages))
	for i, msg := range messages {
		// Расшифровываем содержимое
		decryptedContent, err := crypto.Decrypt(msg.Content, h.encryptionKey)
		if err != nil {
			log.Printf("Failed to decrypt message %s: %v", msg.ID, err)
			decryptedContent = "[Encrypted message]" // Fallback на случай ошибки
		}
		msg.Content = decryptedContent
		chatMessages[i] = gin.H{
			"id":         msg.ID,
			"santa_id":   msg.SantaID,
			"giftee_id":  msg.GifteeID,
			"from_santa": msg.FromSanta,
			"content":    msg.Content,
			"read_at":    msg.ReadAt,
			"created_at": msg.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, chatMessages)
}

// GetUnreadCount возвращает количество непрочитанных сообщений для участника
func (h *Handler) GetUnreadCount(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid raffle ID"})
		return
	}

	userID, _ := c.Get("user_id")

	// Получаем участника
	var member models.Member
	if err := h.DB.First(&member, "group_id = ? AND user_id = ?", groupID, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not a member of this raffle"})
		return
	}

	var unreadFromGiftee int64
	var unreadFromSanta int64

	// Считаем непрочитанные от получателя (если я - даритель)
	if member.GifteeID != nil {
		h.DB.Model(&models.Message{}).
			Where("group_id = ? AND santa_id = ? AND giftee_id = ? AND from_santa = false AND read_at IS NULL",
				groupID, member.ID, *member.GifteeID).
			Count(&unreadFromGiftee)
	}

	// Считаем непрочитанные от дарителя (если я - получатель)
	var santa models.Member
	if err := h.DB.First(&santa, "group_id = ? AND giftee_id = ?", groupID, member.ID).Error; err == nil {
		h.DB.Model(&models.Message{}).
			Where("group_id = ? AND santa_id = ? AND giftee_id = ? AND from_santa = true AND read_at IS NULL",
				groupID, santa.ID, member.ID).
			Count(&unreadFromSanta)
	}

	c.JSON(http.StatusOK, gin.H{
		"unread_from_giftee": unreadFromGiftee,
		"unread_from_santa":  unreadFromSanta,
		"total":              unreadFromGiftee + unreadFromSanta,
	})
}
