import { NotFoundError } from '@linkedin-clone/shared';
import { Education } from '../models';
import { educationRepository } from '../repositories/education.repository';
import type { CreateEducationInput } from '../validators/user.validators';

class EducationService {
  private ownedOrThrow = async (id: string, profileId: string): Promise<Education> => {
    const row = await educationRepository.findById(id);
    if (!row || row.profileId !== profileId) throw new NotFoundError('Education not found');
    return row;
  };

  public list = (profileId: string): Promise<Education[]> => {
    return educationRepository.listByProfile(profileId);
  };

  public create = (profileId: string, input: CreateEducationInput): Promise<Education> => {
    return educationRepository.create({
      profileId,
      school: input.school,
      degree: input.degree ?? null,
      fieldOfStudy: input.fieldOfStudy ?? null,
      startYear: input.startYear,
      endYear: input.endYear ?? null,
      grade: input.grade ?? null,
      activities: input.activities ?? null,
    });
  };

  public update = async (
    id: string,
    profileId: string,
    input: CreateEducationInput,
  ): Promise<Education> => {
    const row = await this.ownedOrThrow(id, profileId);
    return educationRepository.update(row, {
      school: input.school,
      degree: input.degree ?? null,
      fieldOfStudy: input.fieldOfStudy ?? null,
      startYear: input.startYear,
      endYear: input.endYear ?? null,
      grade: input.grade ?? null,
      activities: input.activities ?? null,
    });
  };

  public remove = async (id: string, profileId: string): Promise<void> => {
    const deleted = await educationRepository.delete(id, profileId);
    if (deleted === 0) throw new NotFoundError('Education not found');
  };
}

export const educationService = new EducationService();
