import { Profile, Experience, Education, Skill, Certification } from '../models';

/** All Profile data-access lives here; services never call the model directly. */
class ProfileRepository {
  public findById = (id: string): Promise<Profile | null> => {
    return Profile.findByPk(id);
  };

  /** Full profile with all related collections — used for public/own profile view. */
  public findFullById = (id: string): Promise<Profile | null> => {
    return Profile.findByPk(id, {
      include: [
        { model: Experience, as: 'experiences' },
        { model: Education, as: 'educations' },
        { model: Certification, as: 'certifications' },
        { model: Skill, as: 'skills', through: { attributes: ['endorsements'] } },
      ],
      order: [
        [{ model: Experience, as: 'experiences' }, 'startDate', 'DESC'],
        [{ model: Education, as: 'educations' }, 'startYear', 'DESC'],
      ],
    });
  };

  public create = (data: { id: string; firstName: string; lastName: string }): Promise<Profile> => {
    return Profile.create({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      headline: null,
      summary: null,
      avatarUrl: null,
      bannerUrl: null,
      location: null,
      website: null,
      industry: null,
    });
  };

  public update = (profile: Profile, changes: Partial<Profile>): Promise<Profile> => {
    return profile.update(changes);
  };

  public incrementViews = async (id: string): Promise<void> => {
    await Profile.increment('profileViews', { by: 1, where: { id } });
  };
}

export const profileRepository = new ProfileRepository();
