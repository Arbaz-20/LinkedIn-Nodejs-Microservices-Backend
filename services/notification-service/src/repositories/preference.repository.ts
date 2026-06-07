import { NotificationPreference } from '../models';

export interface PreferenceFlags {
  inApp?: boolean;
  email?: boolean;
  push?: boolean;
  connections?: boolean;
  messages?: boolean;
  posts?: boolean;
  jobs?: boolean;
}

class PreferenceRepository {
  public findByUserId = (userId: string): Promise<NotificationPreference | null> => {
    return NotificationPreference.findOne({ where: { userId } });
  };

  public create = (userId: string): Promise<NotificationPreference> => {
    return NotificationPreference.create({ userId });
  };

  public update = (
    row: NotificationPreference,
    changes: PreferenceFlags,
  ): Promise<NotificationPreference> => {
    return row.update(changes);
  };
}

export const preferenceRepository = new PreferenceRepository();
