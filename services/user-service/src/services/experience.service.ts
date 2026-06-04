import { NotFoundError } from '@linkedin-clone/shared';
import { Experience } from '../models';
import { experienceRepository } from '../repositories/experience.repository';
import type { CreateExperienceInput } from '../validators/user.validators';

class ExperienceService {
  /** Load an experience and assert it belongs to the given profile. */
  private ownedOrThrow = async (id: string, profileId: string): Promise<Experience> => {
    const row = await experienceRepository.findById(id);
    if (!row || row.profileId !== profileId) throw new NotFoundError('Experience not found');
    return row;
  };

  public list = (profileId: string): Promise<Experience[]> => {
    return experienceRepository.listByProfile(profileId);
  };

  public create = (profileId: string, input: CreateExperienceInput): Promise<Experience> => {
    return experienceRepository.create({
      profileId,
      title: input.title,
      company: input.company,
      companyLogo: input.companyLogo ?? null,
      location: input.location ?? null,
      startDate: input.startDate,
      endDate: input.isCurrent ? null : input.endDate ?? null,
      isCurrent: input.isCurrent ?? false,
      description: input.description ?? null,
    });
  };

  public update = async (
    id: string,
    profileId: string,
    input: CreateExperienceInput,
  ): Promise<Experience> => {
    const row = await this.ownedOrThrow(id, profileId);
    return experienceRepository.update(row, {
      title: input.title,
      company: input.company,
      companyLogo: input.companyLogo ?? null,
      location: input.location ?? null,
      startDate: input.startDate,
      endDate: input.isCurrent ? null : input.endDate ?? null,
      isCurrent: input.isCurrent ?? false,
      description: input.description ?? null,
    });
  };

  public remove = async (id: string, profileId: string): Promise<void> => {
    const deleted = await experienceRepository.delete(id, profileId);
    if (deleted === 0) throw new NotFoundError('Experience not found');
  };
}

export const experienceService = new ExperienceService();
