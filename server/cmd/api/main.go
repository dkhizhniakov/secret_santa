package main

import (
	"log"
	"os"

	"secret-santa/internal/config"
	"secret-santa/internal/database"
	"secret-santa/internal/handlers"
	"secret-santa/internal/middleware"
	"secret-santa/internal/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if exists
	godotenv.Load()

	// Load configuration
	cfg := config.Load()

	// Connect to database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize S3 storage
	s3Storage, err := storage.NewS3Storage(
		cfg.AWSAccessKey,
		cfg.AWSSecretKey,
		cfg.AWSRegion,
		cfg.S3Bucket,
	)
	if err != nil {
		log.Fatal("Failed to initialize S3 storage:", err)
	}

	// Initialize WebSocket Hub с ключом шифрования
	hub := handlers.NewHub(db, cfg.EncryptionKey)
	go hub.Run()
	log.Println("WebSocket Hub started")

	// Setup Gin
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Trust only local proxies (не доверяем всем прокси)
	if err := r.SetTrustedProxies([]string{"127.0.0.1", "::1"}); err != nil {
		log.Fatal("Failed to set trusted proxies:", err)
	}

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CorsOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Debug routes endpoint (temporary)
	r.GET("/debug/routes", func(c *gin.Context) {
		routes := r.Routes()
		c.JSON(200, gin.H{"routes": routes})
	})

	// Initialize handlers
	h := handlers.New(db, cfg, s3Storage, hub)

	// API routes
	api := r.Group("/api")
	{
		// Auth routes (OAuth)
		auth := api.Group("/auth")
		{
			// Google OAuth
			auth.GET("/google", h.GoogleLogin)
			auth.GET("/google/callback", h.GoogleCallback)

			// Telegram Login
			auth.POST("/telegram", h.TelegramLogin)

			// Current user
			auth.GET("/me", middleware.Auth(cfg.JWTSecret), h.Me)
			auth.POST("/logout", h.Logout)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.Auth(cfg.JWTSecret))
		{
			// Upload
			protected.POST("/upload/avatar", h.UploadAvatar)

			// Profile
			protected.GET("/profile", h.GetProfile)
			protected.PUT("/profile", h.UpdateProfile)

			// Raffles
			protected.GET("/raffles", h.GetRaffles)
			protected.POST("/raffles", h.CreateRaffle)
			protected.GET("/raffles/:id", h.GetRaffle)
			protected.DELETE("/raffles/:id", h.DeleteRaffle)
			protected.POST("/raffles/:id/join", h.JoinRaffle)
			protected.POST("/raffles/:id/draw", h.DrawNames)
			protected.GET("/raffles/:id/my-assignment", h.GetMyAssignment)

			// Participant profile in raffle
			protected.PUT("/raffles/:id/my-profile", h.UpdateMyProfile)
			protected.GET("/raffles/:id/my-giftee", h.GetMyGiftee)

			// Exclusions management (only for raffle owner)
			protected.GET("/raffles/:id/exclusions", h.GetExclusions)
			protected.POST("/raffles/:id/exclusions", h.CreateExclusion)
			protected.DELETE("/raffles/:id/exclusions/:exclusionId", h.DeleteExclusion)

			// Chat REST API (protected)
			protected.GET("/raffles/:id/chat/giftee", h.GetChatWithGiftee)
			protected.GET("/raffles/:id/chat/santa", h.GetChatWithSanta)
			protected.GET("/raffles/:id/chat/unread", h.GetUnreadCount)
		}

		// WebSocket endpoint (auth via query parameter, not middleware)
		api.GET("/raffles/:id/chat/ws", h.HandleWebSocket)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
