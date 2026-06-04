import { NotFoundError, getRedis, createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { Profile } from '../models';
import { profileRepository } from '../repositories/profile.repository';
import { userEventPublisher } from '../events/publishers';
import type { UpdateProfileInput } from '../validators/user.validators';

const logger = createLogger(config.SERVICE_NAME);

class ProfileService {
  private cacheKey = (id: string): string => `profile:${id}`;

  private invalidateCache = async (id: string): Promise<void> => {
    try {
      if (config.REDIS_URL) await getRedis(config.REDIS_URL).del(this.cacheKey(id));
    } catch (err) {
      logger.warn({ err, id }, 'profile cache invalidation failed');
    }
  };

  /** Emit user.updated so search-service (and others) can re-index. */
  private emitUpdated = async (profile: Profile): Promise<void> => {
    await userEventPublisher.publishUserUpdated({
      userId: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      headline: profile.headline,
      avatarUrl: profile.avatarUrl,
      location: profile.location,
      industry: profile.industry,
    });
  };

  /** Create a profile in response to the auth user.registered event (idempotent). */
  public createFromRegistration = async (data: {
    userId: string;
    firstName: string;
    lastName: string;
  }): Promise<void> => {
    const existing = await profileRepository.findById(data.userId);
    if (existing) {
      logger.info({ userId: data.userId }, 'profile already exists — skipping create');
      return;
    }
    const profile = await profileRepository.create({
      id: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    logger.info({ userId: profile.id }, 'profile created from registration');
    await this.emitUpdated(profile);
  };

  /** Own profile (full graph). Throws if missing. */
  public getOwn = async (userId: string): Promise<Profile> => {
    const profile = await profileRepository.findFullById(userId);
    if (!profile) throw new NotFoundError('Profile not found');
    return profile;
  };

  /**
   * Public profile by id (full graph). Increments the view counter when the
   * viewer is not the owner. Throws if missing.
   */
  public getPublic = async (id: string, viewerId?: string): Promise<Profile> => {
    const profile = await profileRepository.findFullById(id);
    if (!profile) throw new NotFoundError('Profile not found');
    if (viewerId && viewerId !== id) {
      await profileRepository.incrementViews(id);
      await this.invalidateCache(id);
    }
    return profile;
  };

  public update = async (userId: string, input: UpdateProfileInput): Promise<Profile> => {
    const profile = await profileRepository.findById(userId);
    if (!profile) throw new NotFoundError('Profile not found');
    const updated = await profileRepository.update(profile, input);
    await this.invalidateCache(userId);
    await this.emitUpdated(updated);
    return updated;
  };

  public setAvatar = async (userId: string, avatarUrl: string): Promise<Profile> => {
    const profile = await profileRepository.findById(userId);
    if (!profile) throw new NotFoundError('Profile not found');
    const updated = await profileRepository.update(profile, { avatarUrl });
    await this.invalidateCache(userId);
    await this.emitUpdated(updated);
    return updated;
  };

  public setBanner = async (userId: string, bannerUrl: string): Promise<Profile> => {
    const profile = await profileRepository.findById(userId);
    if (!profile) throw new NotFoundError('Profile not found');
    const updated = await profileRepository.update(profile, { bannerUrl });
    await this.invalidateCache(userId);
    return updated;
  };
}

export const profileService = new ProfileService();
