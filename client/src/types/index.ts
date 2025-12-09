export interface User {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Member {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
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
