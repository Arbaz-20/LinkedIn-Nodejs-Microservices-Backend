import { CreationAttributes } from 'sequelize';
import { Certification } from '../models';

class CertificationRepository {
  public listByProfile = (profileId: string): Promise<Certification[]> => {
    return Certification.findAll({ where: { profileId }, order: [['issueDate', 'DESC']] });
  };

  public findById = (id: string): Promise<Certification | null> => {
    return Certification.findByPk(id);
  };

  public create = (data: CreationAttributes<Certification>): Promise<Certification> => {
    return Certification.create(data);
  };

  public delete = (id: string, profileId: string): Promise<number> => {
    return Certification.destroy({ where: { id, profileId } });
  };
}

export const certificationRepository = new CertificationRepository();
