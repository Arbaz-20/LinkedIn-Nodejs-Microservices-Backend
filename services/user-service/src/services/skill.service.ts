import { BadRequestError, ConflictError, NotFoundError } from '@linkedin-clone/shared';
import { Skill } from '../models';
import { skillRepository } from '../repositories/skill.repository';
import { profileRepository } from '../repositories/profile.repository';
import type { AddSkillInput } from '../validators/user.validators';

class SkillService {
  public list = (profileId: string): Promise<Skill[]> => {
    return skillRepository.listByProfile(profileId);
  };

  /** Attach a (canonical) skill to a profile, creating the taxonomy row if new. */
  public add = async (profileId: string, input: AddSkillInput): Promise<Skill> => {
    const skill = await skillRepository.findOrCreateByName(input.name, input.category);
    await skillRepository.link(profileId, skill.id);
    return skill;
  };

  public remove = async (profileId: string, skillId: string): Promise<void> => {
    const deleted = await skillRepository.unlink(profileId, skillId);
    if (deleted === 0) throw new NotFoundError('Skill not found on profile');
  };

  /**
   * Endorse another user's skill. The endorser cannot endorse their own skill.
   * Returns the new endorsement total.
   */
  public endorse = async (
    endorserId: string,
    targetProfileId: string,
    skillId: string,
  ): Promise<number> => {
    if (endorserId === targetProfileId) {
      throw new BadRequestError('You cannot endorse your own skill');
    }
    const target = await profileRepository.findById(targetProfileId);
    if (!target) throw new NotFoundError('Profile not found');

    const result = await skillRepository.endorse(endorserId, targetProfileId, skillId);
    if (result.status === 'no-skill') throw new NotFoundError('Skill not found on profile');
    if (result.status === 'duplicate') throw new ConflictError('You have already endorsed this skill');
    return result.endorsements;
  };
}

export const skillService = new SkillService();
