export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'citizen' | 'admin';
  points: number;
  avatar?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  citizenId: string;
  citizenName: string;
  imageUrl: string;
  description: string;
  wasteType: string;
  confidence: number;
  severity: number; // 1-10
  priority: 'Low' | 'Medium' | 'High';
  cleanlinessRating: string;
  environmentalImpact: string;
  recommendation: string;
  lat: number;
  lng: number;
  address: string;
  status: 'pending' | 'assigned' | 'resolved';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  qrCode?: string; // Base64 or interactive
  comments?: Comment[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userRole: 'citizen' | 'admin';
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface LeaderboardUser {
  uid: string;
  name: string;
  points: number;
  rank: number;
}

export interface Crew {
  name: string;
  lat: number;
  lng: number;
  status: 'idle' | 'on_route' | 'active_cleaning';
  assignedComplaintId?: string;
  updatedAt: string;
}
