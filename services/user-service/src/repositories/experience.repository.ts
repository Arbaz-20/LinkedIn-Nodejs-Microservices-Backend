import { CreationAttributes } from 'sequelize';
import { Experience } from '../models';

class ExperienceRepository {
  public listByProfile = (profileId: string): Promise<Experience[]> => {
    return Experience.findAll({ where: { profileId }, order: [['startDate', 'DESC']] });
  };

  public findById = (id: string): Promise<Experience | null> => {
    return Experience.findByPk(id);
  };

  public create = (data: CreationAttributes<Experience>): Promise<Experience> => {
    return Experience.create(data);
  };

  public update = (row: Experience, changes: Partial<Experience>): Promise<Experience> => {
    return row.update(changes);
  };

  public delete = (id: string, profileId: string): Promise<number> => {
    return Experience.destroy({ where: { id, profileId } });
  };
}

export const experienceRepository = new ExperienceRepository();
