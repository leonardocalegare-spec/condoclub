export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'resident' | 'supplier' | 'admin';
  created_at: string;
  phone?: string;
  subscription_status: 'inactive' | 'active' | 'cancelled';
  auth_provider?: 'google' | 'email';
}

export interface Building {
  building_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  unit_count: number;
  invite_code: string;
  created_at: string;
  image_url?: string;
  resident_count?: number;
}

export interface Membership {
  membership_id: string;
  user_id: string;
  building_id: string;
  unit_number: string;
  status: 'active' | 'inactive';
  joined_at: string;
}

export interface Supplier {
  supplier_id: string;
  user_id: string;
  company_name: string;
  description: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  phone?: string;
  email?: string;
}

export interface DealTier {
  min_participants: number;
  price: number;
  discount_percent: number;
}

export interface DealParticipant {
  participant_id: string;
  deal_id: string;
  user_id: string;
  building_id: string;
  joined_at: string;
  status: string;
  payment_id?: string;
  user?: {
    user_id: string;
    name: string;
    email: string;
  };
}

export interface Deal {
  deal_id: string;
  supplier_id: string;
  building_id: string;
  title: string;
  description: string;
  category: string;
  original_price: number;
  tiers: DealTier[];
  current_price: number;
  min_participants: number;
  max_participants: number;
  current_participants: number;
  status: 'draft' | 'active' | 'locked' | 'completed' | 'cancelled' | 'expired';
  service_date?: string;
  deadline: string;
  created_at: string;
  image_url?: string;
  supplier?: Supplier;
  user_joined?: boolean;
  participants?: DealParticipant[];
}

export interface Booking {
  booking_id: string;
  deal_id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  service_date?: string;
  created_at: string;
  notes?: string;
  deal?: Deal;
  supplier?: Supplier;
}

export interface Subscription {
  subscription_id: string;
  user_id: string;
  status: 'active' | 'cancelled' | 'expired';
  plan: string;
  price: number;
  started_at: string;
  expires_at: string;
}

export interface AuthState {
  user: User | null;
  membership: Membership | null;
  building: Building | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
