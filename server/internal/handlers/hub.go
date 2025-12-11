package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"

	"secret-santa/internal/crypto"
	"secret-santa/internal/models"
	"secret-santa/internal/validator"
)

// Client представляет WebSocket клиента
type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	userID   uuid.UUID
	memberID uuid.UUID // ID участника в конкретном розыгрыше
	groupID  uuid.UUID
}

// Hub управляет всеми WebSocket соединениями
type Hub struct {
	clients       map[*Client]bool
	broadcast     chan *BroadcastMessage
	register      chan *Client
	unregister    chan *Client
	db            *gorm.DB
	encryptionKey []byte
	mu            sync.RWMutex
}

// BroadcastMessage представляет сообщение для broadcast
type BroadcastMessage struct {
	GroupID  uuid.UUID
	SantaID  uuid.UUID
	GifteeID uuid.UUID
	Message  *ChatMessage
}

// ChatMessage представляет структуру сообщения в чате
type ChatMessage struct {
	ID        uuid.UUID  `json:"id"`
	SantaID   uuid.UUID  `json:"santa_id"`
	GifteeID  uuid.UUID  `json:"giftee_id"`
	FromSanta bool       `json:"from_santa"`
	Content   string     `json:"content"`
	ReadAt    *time.Time `json:"read_at"`
	CreatedAt time.Time  `json:"created_at"`
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024 // 512 KB
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// В production нужно проверять origin
		return true
	},
}

// NewHub создает новый Hub
func NewHub(db *gorm.DB, encryptionKey []byte) *Hub {
	return &Hub{
		clients:       make(map[*Client]bool),
		broadcast:     make(chan *BroadcastMessage),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		db:            db,
		encryptionKey: encryptionKey,
	}
}

// Run запускает Hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client registered: user=%s, member=%s, group=%s",
				client.userID, client.memberID, client.groupID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client unregistered: user=%s", client.userID)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			// Отправляем сообщение только участникам этой пары (santa и giftee)
			for client := range h.clients {
				if client.groupID == message.GroupID &&
					(client.memberID == message.SantaID || client.memberID == message.GifteeID) {
					select {
					case client.send <- mustMarshal(message.Message):
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// readPump читает сообщения от клиента
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	c.conn.SetReadLimit(maxMessageSize)

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Парсим входящее сообщение
		var incomingMsg struct {
			Content string `json:"content"`
			Role    string `json:"role"` // "santa" или "giftee"
		}
		if err := json.Unmarshal(message, &incomingMsg); err != nil {
			log.Printf("Invalid message format: %v", err)
			continue
		}

		// Валидируем сообщение
		incomingMsg.Content = validator.SanitizeString(incomingMsg.Content)
		if err := validator.ValidateMessage(incomingMsg.Content); err != nil {
			log.Printf("Message validation failed: %v", err)
			// Отправляем ошибку клиенту
			errorMsg := map[string]string{"error": "Invalid message: " + err.Error()}
			if errData, _ := json.Marshal(errorMsg); errData != nil {
				c.send <- errData
			}
			continue
		}

		// Получаем информацию о текущем участнике
		var member models.Member
		if err := c.hub.db.First(&member, "id = ?", c.memberID).Error; err != nil {
			log.Printf("Member not found: %v", err)
			continue
		}

		// Проверяем, что жеребьевка проведена
		if member.GifteeID == nil {
			log.Printf("Draw not performed yet for member %s", c.memberID)
			continue
		}

		// Определяем, кто отправитель и получатель на основе роли
		var santaID, gifteeID uuid.UUID
		var fromSanta bool

		if incomingMsg.Role == "santa" {
			// Я пишу как Санта своему получателю
			santaID = c.memberID
			gifteeID = *member.GifteeID
			fromSanta = true
		} else {
			// Я пишу как Получатель своему Санте
			// Находим моего Санту
			var santa models.Member
			if err := c.hub.db.First(&santa, "giftee_id = ?", c.memberID).Error; err != nil {
				log.Printf("Santa not found for giftee %s: %v", c.memberID, err)
				continue
			}
			santaID = santa.ID
			gifteeID = c.memberID
			fromSanta = false
		}

		// Шифруем содержимое сообщения перед сохранением в БД
		encryptedContent, err := crypto.Encrypt(incomingMsg.Content, c.hub.encryptionKey)
		if err != nil {
			log.Printf("Failed to encrypt message: %v", err)
			continue
		}

		// Сохраняем сообщение в БД (в зашифрованном виде)
		dbMessage := models.Message{
			GroupID:   c.groupID,
			SantaID:   santaID,
			GifteeID:  gifteeID,
			FromSanta: fromSanta,
			Content:   encryptedContent, // Зашифрованный текст
		}

		if err := c.hub.db.Create(&dbMessage).Error; err != nil {
			log.Printf("Failed to save message: %v", err)
			continue
		}

		// Отправляем сообщение всем участникам этой пары (в оригинальном виде)
		chatMsg := &ChatMessage{
			ID:        dbMessage.ID,
			SantaID:   santaID,
			GifteeID:  gifteeID,
			FromSanta: dbMessage.FromSanta,
			Content:   incomingMsg.Content, // Отправляем расшифрованный текст
			ReadAt:    dbMessage.ReadAt,
			CreatedAt: dbMessage.CreatedAt,
		}

		c.hub.broadcast <- &BroadcastMessage{
			GroupID:  c.groupID,
			SantaID:  santaID,
			GifteeID: gifteeID,
			Message:  chatMsg,
		}
	}
}

// writePump отправляет сообщения клиенту
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Добавляем очередные сообщения из буфера
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func mustMarshal(v interface{}) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return []byte("{}")
	}
	return data
}
