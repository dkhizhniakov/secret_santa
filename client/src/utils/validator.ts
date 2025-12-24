// Максимальные длины полей (соответствуют серверным)
export const MAX_MESSAGE_LENGTH = 10000;
export const MAX_PHONE_LENGTH = 30;
export const MAX_ADDRESS_LENGTH = 200;
export const MAX_CITY_LENGTH = 100;
export const MAX_REGION_LENGTH = 100;
export const MAX_POSTAL_CODE_LENGTH = 20;
export const MAX_WISHLIST_LENGTH = 10000;
export const MAX_ABOUT_LENGTH = 10000;

// Опасные паттерны для SQL/NoSQL injection и XSS
const DANGEROUS_PATTERNS = [
  // SQL injection
  /(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/i,
  // XSS
  /(<script|<iframe|<object|<embed|javascript:)/i,
  /<img[^>]*onerror/i,
];

/**
 * Проверяет строку на наличие опасного содержимого
 */
export const containsDangerousContent = (value: string): boolean => {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(value));
};

/**
 * Очищает строку от null bytes и лишних пробелов
 */
export const sanitizeString = (value: string): string => {
  return value.replace(/\x00/g, "").trim();
};

/**
 * Валидация сообщения чата
 */
export const validateMessage = (content: string): string | null => {
  const sanitized = sanitizeString(content);

  if (!sanitized) {
    return "Message cannot be empty";
  }

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    return `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`;
  }

  if (containsDangerousContent(sanitized)) {
    return "Message contains prohibited content";
  }

  return null;
};

/**
 * Валидация поля профиля
 */
export const validateProfileField = (
  value: string,
  maxLength: number,
  fieldName: string
): string | null => {
  if (!value) {
    return null; // Пустые поля допустимы
  }

  const sanitized = sanitizeString(value);

  if (sanitized.length > maxLength) {
    return `${fieldName} is too long (max ${maxLength} characters)`;
  }

  if (containsDangerousContent(sanitized)) {
    return `${fieldName} contains prohibited content`;
  }

  return null;
};

/**
 * Валидация телефона
 */
export const validatePhone = (phone: string): string | null => {
  if (!phone) {
    return null;
  }

  const sanitized = sanitizeString(phone);

  if (sanitized.length > MAX_PHONE_LENGTH) {
    return "Phone number is too long";
  }

  // Разрешаем только цифры, +, -, (, ), пробелы
  if (!/^[\d\s+\-()]+$/.test(sanitized)) {
    return "Phone number contains invalid characters";
  }

  return null;
};

/**
 * Валидация почтового индекса
 */
export const validatePostalCode = (code: string): string | null => {
  if (!code) {
    return null;
  }

  const sanitized = sanitizeString(code);

  if (sanitized.length > MAX_POSTAL_CODE_LENGTH) {
    return "Postal code is too long";
  }

  // Разрешаем цифры, буквы, пробелы, дефисы
  if (!/^[\w\s\-]+$/.test(sanitized)) {
    return "Postal code contains invalid characters";
  }

  return null;
};

