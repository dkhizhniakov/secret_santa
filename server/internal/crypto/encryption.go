package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"log"
)

// Encrypt шифрует текст с помощью AES-256-GCM
func Encrypt(plaintext string, key []byte) (string, error) {
	log.Println("Encrypting message:", string(key),len(key))
	if len(key) != 32 {
		return "", errors.New("encryption key must be 32 bytes for AES-256")
	}

	// Создаем AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	// Используем GCM mode (Galois/Counter Mode) для аутентифицированного шифрования
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Создаем nonce (одноразовый номер)
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Шифруем (nonce + ciphertext в одном массиве)
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Конвертируем в base64 для хранения в БД
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt расшифровывает текст
func Decrypt(ciphertext string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("encryption key must be 32 bytes for AES-256")
	}

	// Декодируем из base64
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	// Создаем AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	// Используем GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Извлекаем nonce
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, cipherData := data[:nonceSize], data[nonceSize:]

	// Расшифровываем
	plaintext, err := gcm.Open(nil, nonce, cipherData, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
