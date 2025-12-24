package validator

import (
	"errors"
	"regexp"
	"strings"
	"unicode/utf8"
)

// Максимальные длины полей
const (
	MaxMessageLength     = 5000
	MaxNameLength        = 100
	MaxPhoneLength       = 30
	MaxAddressLength     = 200
	MaxCityLength        = 100
	MaxRegionLength      = 100
	MaxPostalCodeLength  = 20
	MaxCountryCodeLength = 2
	MaxWishlistLength    = 5000
	MaxAboutLength       = 5000
)

// Опасные паттерны для SQL/NoSQL injection
var dangerousPatterns = []*regexp.Regexp{
	// SQL injection
	regexp.MustCompile(`(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|<script)`),
	// XSS
	regexp.MustCompile(`(?i)(<script|<iframe|<object|<embed|<img.*onerror|javascript:)`),
	// Command injection (скобки ( ) разрешены)
	regexp.MustCompile(`(?i)(;.*\||\$\{|` + "`" + `)`),
}

// SanitizeString очищает строку от опасных символов
func SanitizeString(s string) string {
	// Убираем null bytes
	s = strings.ReplaceAll(s, "\x00", "")
	// Убираем лишние пробелы
	s = strings.TrimSpace(s)
	return s
}

// ValidateMessage проверяет сообщение чата
func ValidateMessage(content string) error {
	content = SanitizeString(content)

	if content == "" {
		return errors.New("message cannot be empty")
	}

	if utf8.RuneCountInString(content) > MaxMessageLength {
		return errors.New("message too long")
	}

	// Проверяем на опасные паттерны
	for _, pattern := range dangerousPatterns {
		if pattern.MatchString(content) {
			return errors.New("message contains prohibited content")
		}
	}

	return nil
}

// ValidateProfileField проверяет отдельное поле профиля
func ValidateProfileField(fieldName, value string, maxLength int) error {
	if value == "" {
		return nil // Пустые поля допустимы
	}

	value = SanitizeString(value)

	if utf8.RuneCountInString(value) > maxLength {
		return errors.New(fieldName + " is too long")
	}

	// Проверяем на опасные паттерны
	for _, pattern := range dangerousPatterns {
		if pattern.MatchString(value) {
			return errors.New(fieldName + " contains prohibited content")
		}
	}

	return nil
}

// ValidatePhone проверяет формат телефона
func ValidatePhone(phone string) error {
	if phone == "" {
		return nil
	}

	phone = SanitizeString(phone)

	if len(phone) > MaxPhoneLength {
		return errors.New("phone number is too long")
	}

	// Разрешаем только цифры, +, -, (, ), пробелы
	phoneRegex := regexp.MustCompile(`^[\d\s\+\-\(\)]+$`)
	if !phoneRegex.MatchString(phone) {
		return errors.New("phone number contains invalid characters")
	}

	return nil
}

// ValidateCountryCode проверяет код страны (ISO 3166-1 alpha-2)
func ValidateCountryCode(code string) error {
	if code == "" {
		return nil
	}

	code = SanitizeString(code)

	if len(code) != MaxCountryCodeLength {
		return errors.New("invalid country code")
	}

	// Только буквы A-Z
	codeRegex := regexp.MustCompile(`^[A-Za-z]{2}$`)
	if !codeRegex.MatchString(code) {
		return errors.New("country code must be 2 letters")
	}

	return nil
}

// ValidatePostalCode проверяет почтовый индекс
func ValidatePostalCode(code string) error {
	if code == "" {
		return nil
	}

	code = SanitizeString(code)

	if len(code) > MaxPostalCodeLength {
		return errors.New("postal code is too long")
	}

	// Разрешаем цифры, буквы, пробелы, дефисы
	postalRegex := regexp.MustCompile(`^[\d\w\s\-]+$`)
	if !postalRegex.MatchString(code) {
		return errors.New("postal code contains invalid characters")
	}

	return nil
}

// ValidateProfileData проверяет все данные профиля
func ValidateProfileData(data map[string]string) error {
	// Проверяем телефон
	if err := ValidatePhone(data["phone"]); err != nil {
		return err
	}

	// Проверяем страну
	if err := ValidateCountryCode(data["country"]); err != nil {
		return err
	}

	// Проверяем почтовый индекс
	if err := ValidatePostalCode(data["postal_code"]); err != nil {
		return err
	}

	// Проверяем текстовые поля
	fields := map[string]int{
		"about":            MaxAboutLength,
		"address_line1":    MaxAddressLength,
		"address_line2":    MaxAddressLength,
		"address_line1_en": MaxAddressLength,
		"address_line2_en": MaxAddressLength,
		"city":             MaxCityLength,
		"city_en":          MaxCityLength,
		"region":           MaxRegionLength,
		"region_en":        MaxRegionLength,
		"wishlist":         MaxWishlistLength,
		"anti_wishlist":    MaxWishlistLength,
	}

	for field, maxLen := range fields {
		if err := ValidateProfileField(field, data[field], maxLen); err != nil {
			return err
		}
	}

	return nil
}
