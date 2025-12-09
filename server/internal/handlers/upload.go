package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// UploadAvatar загружает аватар в S3
func (h *Handler) UploadAvatar(c *gin.Context) {
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл не найден"})
		return
	}

	// Проверяем тип файла
	contentType := file.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл должен быть изображением"})
		return
	}

	// Проверяем размер (max 5MB)
	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл слишком большой (макс 5MB)"})
		return
	}

	// Открываем файл
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось открыть файл"})
		return
	}
	defer src.Close()

	// Загружаем в S3
	url, err := h.storage.UploadImage(c.Request.Context(), src, file.Filename, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка загрузки файла: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}
