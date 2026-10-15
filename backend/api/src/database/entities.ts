import { User } from '../users/user.entity.js';
import { Category } from '../categories/category.entity.js';
import { Provider } from '../providers/provider.entity.js';
import { ProviderService } from '../providers/provider-service.entity.js';
import { ProviderPhoto } from '../providers/provider-photo.entity.js';
import { TimeOff } from '../providers/time-off.entity.js';
import { Appointment } from '../appointments/appointment.entity.js';
import { Review } from '../reviews/review.entity.js';
import { Favorite } from '../favorites/favorite.entity.js';

export const ENTITIES = [
  User,
  Category,
  Provider,
  ProviderService,
  ProviderPhoto,
  TimeOff,
  Appointment,
  Review,
  Favorite,
];
