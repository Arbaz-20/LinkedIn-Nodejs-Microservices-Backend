import { NotificationPreference } from '../models';
import { preferenceRepository, PreferenceFlags } from '../repositories/preference.repository';

/** Notification category mapped from an event domain. */
export type PreferenceCategory = 'connections' | 'messages' | 'posts' | 'jobs';

class PreferenceService {
  /** Get a user's preferences, creating a defaults row if none exists. */
  public getOrCreate = async (userId: string): Promise<NotificationPreference> => {
    const existing = await preferenceRepository.findByUserId(userId);
    if (existing) return existing;
    return preferenceRepository.create(userId);
  };

  /** Update a subset of a user's preference flags (creating defaults first). */
  public update = async (
    userId: string,
    changes: PreferenceFlags,
  ): Promise<NotificationPreference> => {
    const row = await this.getOrCreate(userId);
    return preferenceRepository.update(row, changes);
  };

  /**
   * Whether an in-app notification should be created for a recipient given the
   * event's category. Defaults to allowed when no preferences row exists.
   */
  public allowsInApp = async (
    userId: string,
    category: PreferenceCategory,
  ): Promise<boolean> => {
    const prefs = await preferenceRepository.findByUserId(userId);
    if (!prefs) return true;
    if (!prefs.inApp) return false;
    return prefs[category];
  };
}

export const preferenceService = new PreferenceService();
