import { CreationAttributes } from 'sequelize';
import { Education } from '../models';

class EducationRepository {
  public listByProfile = (profileId: string): Promise<Education[]> => {
    return Education.findAll({ where: { profileId }, order: [['startYear', 'DESC']] });
  };

  public findById = (id: string): Promise<Education | null> => {
    return Education.findByPk(id);
  };

  public create = (data: CreationAttributes<Education>): Promise<Education> => {
    return Education.create(data);
  };

  public update = (row: Education, changes: Partial<Education>): Promise<Education> => {
    return row.update(changes);
  };

  public delete = (id: string, profileId: string): Promise<number> => {
    return Education.destroy({ where: { id, profileId } });
  };
}

export const educationRepository = new EducationRepository();
