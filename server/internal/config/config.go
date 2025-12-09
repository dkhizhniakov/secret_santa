package config

import (
	"os"
	"strings"
)

type Config struct {
	Env         string
	Port        string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	JWTSecret   string
	CorsOrigins []string
	BaseURL     string // Frontend URL для редиректов после авторизации
	ServerURL   string // Backend URL для OAuth callbacks

	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string

	// Telegram Login
	TelegramBotToken string

	// AWS S3 для хранения файлов
	AWSAccessKey string
	AWSSecretKey string
	AWSRegion    string
	S3Bucket     string
}

func Load() *Config {
	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:3000"
	}

	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}

	serverURL := os.Getenv("SERVER_URL")
	if serverURL == "" {
		serverURL = "http://localhost:8080"
	}

	return &Config{
		Env:         getEnv("ENV", "development"),
		Port:        getEnv("PORT", "8080"),
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "postgres"),
		DBPassword:  getEnv("DB_PASSWORD", "postgres"),
		DBName:      getEnv("DB_NAME", "secret_santa"),
		JWTSecret:   getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		CorsOrigins: strings.Split(corsOrigins, ","),
		BaseURL:     baseURL,
		ServerURL:   serverURL,

		// Google OAuth
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),

		// Telegram Login
		TelegramBotToken: os.Getenv("TELEGRAM_BOT_TOKEN"),

		// AWS S3
		AWSAccessKey: os.Getenv("AWS_ACCESS_KEY_ID"),
		AWSSecretKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		AWSRegion:    getEnv("AWS_REGION", "eu-south-2"),
		S3Bucket:     os.Getenv("S3_BUCKET"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
