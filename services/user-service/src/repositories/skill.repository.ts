import { UniqueConstraintError } from 'sequelize';
import { ProfileSkill, Skill, SkillEndorsement } from '../models';
import { sequelize } from '../db/sequelize';

/** Outcome of an endorsement attempt. */
export type EndorseResult =
  | { status: 'ok'; endorsements: number }
  | { status: 'no-skill' }
  | { status: 'duplicate' };

class SkillRepository {
  /** Find an existing canonical skill by name, or create it. */
  public findOrCreateByName = async (name: string, category?: string | null): Promise<Skill> => {
    const [skill] = await Skill.findOrCreate({
      where: { name },
      defaults: { name, category: category ?? null },
    });
    return skill;
  };

  public findById = (id: string): Promise<Skill | null> => {
    return Skill.findByPk(id);
  };

  /** A profile's skills with endorsement counts (via the join table). */
  public listByProfile = (profileId: string): Promise<Skill[]> => {
    return Skill.findAll({
      include: [{ model: ProfileSkill, where: { profileId }, attributes: ['endorsements'], required: true }],
    });
  };

  public findLink = (profileId: string, skillId: string): Promise<ProfileSkill | null> => {
    return ProfileSkill.findOne({ where: { profileId, skillId } });
  };

  public link = async (profileId: string, skillId: string): Promise<ProfileSkill> => {
    const [link] = await ProfileSkill.findOrCreate({
      where: { profileId, skillId },
      defaults: { profileId, skillId },
    });
    return link;
  };

  public unlink = (profileId: string, skillId: string): Promise<number> => {
    return ProfileSkill.destroy({ where: { profileId, skillId } });
  };

  /**
   * Record one endorsement of a profile's skill by a specific endorser. The
   * unique (endorser, profile, skill) constraint makes this idempotent: a
   * duplicate attempt does not bump the counter. The endorsement row insert and
   * the counter increment happen in one transaction.
   */
  public endorse = async (
    endorserId: string,
    profileId: string,
    skillId: string,
  ): Promise<EndorseResult> => {
    return sequelize.transaction(async (tx) => {
      const link = await ProfileSkill.findOne({ where: { profileId, skillId }, transaction: tx });
      if (!link) return { status: 'no-skill' };

      try {
        await SkillEndorsement.create({ endorserId, profileId, skillId }, { transaction: tx });
      } catch (err) {
        if (err instanceof UniqueConstraintError) return { status: 'duplicate' };
        throw err;
      }

      await link.increment('endorsements', { by: 1, transaction: tx });
      await link.reload({ transaction: tx });
      return { status: 'ok', endorsements: link.endorsements };
    });
  };
}

export const skillRepository = new SkillRepository();
