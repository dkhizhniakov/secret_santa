package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"secret-santa/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// ==================== Types ====================

type UserResponse struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	AvatarURL *string `json:"avatar_url"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type GoogleUserInfo struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

type VKUserInfo struct {
	Response []struct {
		ID        int64  `json:"id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Photo     string `json:"photo_200"`
	} `json:"response"`
}

type VKIDLoginRequest struct {
	Token string `json:"token"` // access_token from VK ID
	UUID  string `json:"uuid"`  // id_token from VK ID
}

type VKIDUserInfo struct {
	User struct {
		UserID    int64  `json:"user_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Avatar    string `json:"avatar"`
	} `json:"user"`
}

type YandexUserInfo struct {
	ID            string `json:"id"`
	Login         string `json:"login"`
	DisplayName   string `json:"display_name"`
	DefaultAvatar string `json:"default_avatar_id"`
}

type TelegramAuthData struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name,omitempty"`
	Username  string `json:"username,omitempty"`
	PhotoURL  string `json:"photo_url,omitempty"`
	AuthDate  int64  `json:"auth_date"`
	Hash      string `json:"hash"`
}

// ==================== Google OAuth ====================

func (h *Handler) getGoogleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     h.cfg.GoogleClientID,
		ClientSecret: h.cfg.GoogleClientSecret,
		RedirectURL:  h.cfg.ServerURL + "/api/auth/google/callback",
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
}

// GoogleLogin - редирект на страницу авторизации Google
func (h *Handler) GoogleLogin(c *gin.Context) {
	config := h.getGoogleOAuthConfig()

	// Генерируем state для защиты от CSRF
	state := uuid.New().String()

	// Сохраняем state в httpOnly cookie на 5 минут
	secure := h.cfg.Env == "production"
	c.SetCookie(
		"oauth_state",
		state,
		300, // 5 минут
		"/",
		"",
		secure, // secure = true в production (HTTPS)
		true,   // httpOnly = true
	)

	url := config.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// GoogleCallback - обработка callback от Google
func (h *Handler) GoogleCallback(c *gin.Context) {
	config := h.getGoogleOAuthConfig()

	// Проверяем state для защиты от CSRF
	receivedState := c.Query("state")
	savedState, err := c.Cookie("oauth_state")
	if err != nil || receivedState != savedState {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=invalid_state")
		return
	}

	// Удаляем использованный state
	secure := h.cfg.Env == "production"
	c.SetCookie("oauth_state", "", -1, "/", "", secure, true)

	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=no_code")
		return
	}

	// Обмениваем code на token
	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=exchange_failed")
		return
	}

	// Получаем информацию о пользователе
	client := config.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=userinfo_failed")
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var googleUser GoogleUserInfo
	if err := json.Unmarshal(body, &googleUser); err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=parse_failed")
		return
	}

	// Ищем или создаём пользователя
	user, err := h.findOrCreateGoogleUser(googleUser)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=db_error")
		return
	}

	// Генерируем JWT
	jwtToken, err := h.generateToken(user)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=token_error")
		return
	}

	// Редирект на frontend с токеном
	c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/auth/callback?token="+jwtToken)
}

func (h *Handler) findOrCreateGoogleUser(googleUser GoogleUserInfo) (*models.User, error) {
	var user models.User

	// Ищем по GoogleID
	err := h.DB.Where("google_id = ?", googleUser.ID).First(&user).Error
	if err == nil {
		// Обновляем данные
		user.Name = googleUser.Name
		if googleUser.Picture != "" {
			user.AvatarURL = &googleUser.Picture
		}
		h.DB.Save(&user)
		return &user, nil
	}

	// Создаём нового пользователя
	user = models.User{
		GoogleID:  &googleUser.ID,
		Name:      googleUser.Name,
		AvatarURL: &googleUser.Picture,
	}
	if err := h.DB.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// ==================== VK ID Login ====================

// VKLogin - проверка токена от VK ID SDK
func (h *Handler) VKLogin(c *gin.Context) {
	var req VKIDLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Получаем информацию о пользователе через VK API с access_token
	client := &http.Client{}
	vkReq, err := http.NewRequest("GET", "https://api.vk.com/method/users.get?fields=photo_200&v=5.131", nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}
	vkReq.Header.Set("Authorization", "Bearer "+req.Token)

	resp, err := client.Do(vkReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var vkUser VKUserInfo
	if err := json.Unmarshal(body, &vkUser); err != nil || len(vkUser.Response) == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid VK token"})
		return
	}

	// Ищем или создаём пользователя
	user, err := h.findOrCreateVKUser(vkUser.Response[0])
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Генерируем JWT
	token, err := h.generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User: UserResponse{
			ID:        user.ID.String(),
			Name:      user.Name,
			AvatarURL: user.AvatarURL,
		},
	})
}

func (h *Handler) findOrCreateVKUser(vkUserData struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Photo     string `json:"photo_200"`
}) (*models.User, error) {
	var user models.User

	// Ищем по VKID
	err := h.DB.Where("vk_id = ?", vkUserData.ID).First(&user).Error
	if err == nil {
		// Обновляем данные
		user.Name = vkUserData.FirstName + " " + vkUserData.LastName
		if vkUserData.Photo != "" {
			user.AvatarURL = &vkUserData.Photo
		}
		h.DB.Save(&user)
		return &user, nil
	}

	// Создаём нового пользователя
	name := vkUserData.FirstName
	if vkUserData.LastName != "" {
		name += " " + vkUserData.LastName
	}

	user = models.User{
		VKID: &vkUserData.ID,
		Name: name,
	}
	if vkUserData.Photo != "" {
		user.AvatarURL = &vkUserData.Photo
	}

	if err := h.DB.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// ==================== Yandex OAuth ====================

func (h *Handler) getYandexOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     h.cfg.YandexClientID,
		ClientSecret: h.cfg.YandexClientSecret,
		RedirectURL:  h.cfg.ServerURL + "/api/auth/yandex/callback",
		Scopes:       []string{},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://oauth.yandex.ru/authorize",
			TokenURL: "https://oauth.yandex.ru/token",
		},
	}
}

// YandexLogin - редирект на страницу авторизации Yandex
func (h *Handler) YandexLogin(c *gin.Context) {
	config := h.getYandexOAuthConfig()

	// Генерируем state для защиты от CSRF
	state := uuid.New().String()

	// Сохраняем state в httpOnly cookie на 5 минут
	secure := h.cfg.Env == "production"
	c.SetCookie(
		"oauth_state_yandex",
		state,
		300, // 5 минут
		"/",
		"",
		secure, // secure = true в production (HTTPS)
		true,   // httpOnly = true
	)

	url := config.AuthCodeURL(state)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// YandexCallback - обработка callback от Yandex
func (h *Handler) YandexCallback(c *gin.Context) {
	config := h.getYandexOAuthConfig()

	// Проверяем state для защиты от CSRF
	receivedState := c.Query("state")
	savedState, err := c.Cookie("oauth_state_yandex")
	if err != nil || receivedState != savedState {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=invalid_state")
		return
	}

	// Удаляем использованный state
	secure := h.cfg.Env == "production"
	c.SetCookie("oauth_state_yandex", "", -1, "/", "", secure, true)

	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=no_code")
		return
	}

	// Обмениваем code на token
	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=exchange_failed")
		return
	}

	// Получаем информацию о пользователе
	client := config.Client(context.Background(), token)
	resp, err := client.Get("https://login.yandex.ru/info?format=json")
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=userinfo_failed")
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var yandexUser YandexUserInfo
	if err := json.Unmarshal(body, &yandexUser); err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=parse_failed")
		return
	}

	// Ищем или создаём пользователя
	user, err := h.findOrCreateYandexUser(yandexUser)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=db_error")
		return
	}

	// Генерируем JWT
	jwtToken, err := h.generateToken(user)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/login?error=token_error")
		return
	}

	// Редирект на frontend с токеном
	c.Redirect(http.StatusTemporaryRedirect, h.cfg.BaseURL+"/auth/callback?token="+jwtToken)
}

func (h *Handler) findOrCreateYandexUser(yandexUser YandexUserInfo) (*models.User, error) {
	var user models.User

	// Ищем по YandexID
	err := h.DB.Where("yandex_id = ?", yandexUser.ID).First(&user).Error
	if err == nil {
		// Обновляем данные
		if yandexUser.DisplayName != "" {
			user.Name = yandexUser.DisplayName
		} else if yandexUser.Login != "" {
			user.Name = yandexUser.Login
		}
		h.DB.Save(&user)
		return &user, nil
	}

	// Создаём нового пользователя
	name := yandexUser.DisplayName
	if name == "" {
		name = yandexUser.Login
	}

	user = models.User{
		YandexID: &yandexUser.ID,
		Name:     name,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// ==================== Telegram Login ====================

// TelegramLogin - проверка данных от Telegram Login Widget
func (h *Handler) TelegramLogin(c *gin.Context) {
	var data TelegramAuthData
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Проверяем подпись от Telegram
	if !h.verifyTelegramAuth(data) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Telegram signature"})
		return
	}

	// Проверяем что данные не устарели (не старше 24 часов)
	if time.Now().Unix()-data.AuthDate > 86400 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Auth data expired"})
		return
	}

	// Ищем или создаём пользователя
	user, err := h.findOrCreateTelegramUser(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Генерируем JWT
	token, err := h.generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User: UserResponse{
			ID:        user.ID.String(),
			Name:      user.Name,
			AvatarURL: user.AvatarURL,
		},
	})
}

func (h *Handler) verifyTelegramAuth(data TelegramAuthData) bool {
	if h.cfg.TelegramBotToken == "" {
		return false
	}

	// Собираем строку для проверки
	checkData := make(map[string]string)
	checkData["id"] = strconv.FormatInt(data.ID, 10)
	checkData["first_name"] = data.FirstName
	if data.LastName != "" {
		checkData["last_name"] = data.LastName
	}
	if data.Username != "" {
		checkData["username"] = data.Username
	}
	if data.PhotoURL != "" {
		checkData["photo_url"] = data.PhotoURL
	}
	checkData["auth_date"] = strconv.FormatInt(data.AuthDate, 10)

	// Сортируем ключи
	keys := make([]string, 0, len(checkData))
	for k := range checkData {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Формируем data-check-string
	var dataCheckParts []string
	for _, k := range keys {
		dataCheckParts = append(dataCheckParts, fmt.Sprintf("%s=%s", k, checkData[k]))
	}
	dataCheckString := strings.Join(dataCheckParts, "\n")

	// Вычисляем хэш
	secretKey := sha256.Sum256([]byte(h.cfg.TelegramBotToken))
	mac := hmac.New(sha256.New, secretKey[:])
	mac.Write([]byte(dataCheckString))
	expectedHash := hex.EncodeToString(mac.Sum(nil))

	return expectedHash == data.Hash
}

func (h *Handler) findOrCreateTelegramUser(data TelegramAuthData) (*models.User, error) {
	var user models.User

	// Ищем по TelegramID
	err := h.DB.Where("telegram_id = ?", data.ID).First(&user).Error
	if err == nil {
		// Обновляем данные
		name := data.FirstName
		if data.LastName != "" {
			name += " " + data.LastName
		}
		user.Name = name
		if data.PhotoURL != "" {
			user.AvatarURL = &data.PhotoURL
		}
		h.DB.Save(&user)
		return &user, nil
	}

	// Создаём нового пользователя
	name := data.FirstName
	if data.LastName != "" {
		name += " " + data.LastName
	}

	user = models.User{
		TelegramID: &data.ID,
		Name:       name,
	}
	if data.PhotoURL != "" {
		user.AvatarURL = &data.PhotoURL
	}

	if err := h.DB.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// ==================== Common ====================

// Me - получить текущего пользователя
func (h *Handler) Me(c *gin.Context) {
	userID := c.GetString("userID")

	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	if err := h.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, UserResponse{
		ID:        user.ID.String(),
		Name:      user.Name,
		AvatarURL: user.AvatarURL,
	})
}

// Logout - выход (на клиенте просто удаляем токен)
func (h *Handler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Logged out"})
}

func (h *Handler) generateToken(user *models.User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID.String(),
		"exp": time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	})

	return token.SignedString([]byte(h.cfg.JWTSecret))
}
