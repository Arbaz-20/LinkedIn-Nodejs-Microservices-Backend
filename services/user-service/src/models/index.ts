import { Profile } from './Profile';
import { Experience } from './Experience';
import { Education } from './Education';
import { Skill } from './Skill';
import { ProfileSkill } from './ProfileSkill';
import { Certification } from './Certification';
import { SkillEndorsement } from './SkillEndorsement';

// ─── Associations ──────────────────────────────────────────
Profile.hasMany(Experience, { foreignKey: 'profileId', onDelete: 'CASCADE', as: 'experiences' });
Experience.belongsTo(Profile, { foreignKey: 'profileId' });

Profile.hasMany(Education, { foreignKey: 'profileId', onDelete: 'CASCADE', as: 'educations' });
Education.belongsTo(Profile, { foreignKey: 'profileId' });

Profile.hasMany(Certification, { foreignKey: 'profileId', onDelete: 'CASCADE', as: 'certifications' });
Certification.belongsTo(Profile, { foreignKey: 'profileId' });

// Profile <-> Skill many-to-many through ProfileSkill
Profile.belongsToMany(Skill, { through: ProfileSkill, foreignKey: 'profileId', otherKey: 'skillId', as: 'skills' });
Skill.belongsToMany(Profile, { through: ProfileSkill, foreignKey: 'skillId', otherKey: 'profileId', as: 'profiles' });
ProfileSkill.belongsTo(Skill, { foreignKey: 'skillId' });
ProfileSkill.belongsTo(Profile, { foreignKey: 'profileId' });

export { Profile, Experience, Education, Skill, ProfileSkill, Certification, SkillEndorsement };
