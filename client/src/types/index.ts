export interface User {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserProfile {
  id?: string;
  user_id: string;
  name?: string;
  phone?: string | null;
  about?: string | null;
  
  // Адрес на местном языке
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  
  // Адрес на английском
  address_line1_en?: string | null;
  address_line2_en?: string | null;
  city_en?: string | null;
  region_en?: string | null;
  
  wishlist?: string | null;
  anti_wishlist?: string | null;
}

export interface UpdateProfileRequest {
  name?: string | null;
  phone?: string | null;
  about?: string | null;
  
  // Адрес на местном языке
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  
  // Адрес на английском
  address_line1_en?: string | null;
  address_line2_en?: string | null;
  city_en?: string | null;
  region_en?: string | null;
  
  wishlist?: string | null;
  anti_wishlist?: string | null;
}

export interface Member {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  isProfileFilled: boolean;
}

export interface Raffle {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string | null;
  inviteCode: string;
  budget: string;
  eventDate: string | null;
  isDrawn: boolean;
  isOwner: boolean;
  ownerId: string;
  members: Member[];
  createdAt: string;
}

export interface Assignment {
  receiverId: string;
  receiverName: string;
}

// Профиль участника в розыгрыше (расширенный Member)
export interface ParticipantProfile extends UpdateProfileRequest {}

// Полная информация о получателе подарка
export interface Giftee {
  id: string;
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  about?: string | null;
  
  // Адрес на местном языке
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  
  // Адрес на английском
  address_line1_en?: string | null;
  address_line2_en?: string | null;
  city_en?: string | null;
  region_en?: string | null;
  
  wishlist?: string | null;
  anti_wishlist?: string | null;
}

// Информация об участнике в исключении
export interface ParticipantInfo {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string | null;
}

// Исключение (ограничение) между участниками
export interface Exclusion {
  id: string;
  group_id: string;
  participant_a: ParticipantInfo;
  participant_b: ParticipantInfo;
  created_at: string;
}

// Запрос на создание исключения
export interface CreateExclusionRequest {
  participant_a_id: string;
  participant_b_id: string;
}
