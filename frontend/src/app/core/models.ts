/** Formes des données renvoyées par l'API. */

export type Role = 'client' | 'provider' | 'admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: Role;
  quartier: string | null;
  city: string;
  providerId: string | null;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface Category {
  slug: string;
  name: string;
  icon: string;
  providerCount?: number;
}

export interface Quartier {
  name: string;
  commune: string;
  lat: number;
  lng: number;
}

export interface ProviderSummary {
  id: string;
  businessName: string;
  category: Category | null;
  quartier: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  mobile: boolean;
  verified: boolean;
  whatsapp: string | null;
  ratingAvg: number;
  ratingCount: number;
  phone?: string | null;
  distanceKm?: number | null;
  minPrice?: number | null;
  coverUrl?: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  priceFcfa: number;
  priceFrom: boolean;
  durationMinutes: number;
  active: boolean;
}

export interface Photo {
  id: string;
  url: string;
  isCover: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  reply: string | null;
  createdAt: string;
  author: string;
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export interface TimeRange {
  start: string;
  end: string;
}
export type WeeklyHours = Record<Weekday, TimeRange[]>;

export interface ProviderDetail extends ProviderSummary {
  phone: string;
  description: string;
  landmark: string | null;
  weeklyHours: WeeklyHours;
  memberSince: string;
  services: Service[];
  photos: Photo[];
  reviews: Review[];
}

export interface MyProvider extends ProviderDetail {
  published: boolean;
  slotStepMinutes: number;
  referralCode: string;
  calendarImportUrl: string | null;
  calendarFeedPath: string;
}

export interface SearchResult {
  items: ProviderSummary[];
  total: number;
  page: number;
  limit: number;
  origin: { lat: number; lng: number };
}

export interface Slot {
  startsAt: string;
  endsAt: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show';

export interface Appointment {
  id: string;
  status: AppointmentStatus;
  source: 'app' | 'manual';
  startsAt: string;
  endsAt: string;
  serviceId: string | null;
  serviceName: string;
  priceFcfa: number;
  note: string | null;
  address: string | null;
  reviewed: boolean;
  canReview: boolean;
  client: { id: string | null; name: string; phone: string | null } | null;
  provider: {
    id: string;
    businessName?: string;
    quartier?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  createdAt: string;
}

export interface TimeOff {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  source: 'manual' | 'calendar';
}

export interface Totals {
  all: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  revenue: number;
}

export interface Dashboard {
  today: Totals;
  month: Totals;
  year: Totals;
  pendingRequests: number;
  ratingAvg: number;
  ratingCount: number;
}

export type Period = 'day' | 'week' | 'month' | 'year';

export interface Stats {
  period: Period;
  from: string;
  to: string;
  revenue: number;
  previousRevenue: number;
  revenueChange: number | null;
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  cancellationRate: number;
  averageBasket: number;
  newClients: number;
  series: Array<{ label: string; start: string; revenue: number; count: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topClients: Array<{ name: string; count: number; revenue: number }>;
}

export interface ShareInfo {
  link: string;
  imagePath: string;
  text: string;
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  declined: 'Refusé',
  cancelled: 'Annulé',
  completed: 'Terminé',
  no_show: 'Absent',
};

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'warning',
  confirmed: 'success',
  declined: 'danger',
  cancelled: 'danger',
  completed: 'primary',
  no_show: 'danger',
};

export const WEEKDAYS: Array<{ key: Weekday; label: string }> = [
  { key: 'mon', label: 'Lundi' },
  { key: 'tue', label: 'Mardi' },
  { key: 'wed', label: 'Mercredi' },
  { key: 'thu', label: 'Jeudi' },
  { key: 'fri', label: 'Vendredi' },
  { key: 'sat', label: 'Samedi' },
  { key: 'sun', label: 'Dimanche' },
];
