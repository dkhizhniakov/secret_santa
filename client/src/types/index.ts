export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
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

