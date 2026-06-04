import { NotFoundError } from '@linkedin-clone/shared';
import { Certification } from '../models';
import { certificationRepository } from '../repositories/certification.repository';
import type { CreateCertificationInput } from '../validators/user.validators';

class CertificationService {
  public list = (profileId: string): Promise<Certification[]> => {
    return certificationRepository.listByProfile(profileId);
  };

  public create = (profileId: string, input: CreateCertificationInput): Promise<Certification> => {
    return certificationRepository.create({
      profileId,
      name: input.name,
      issuingOrg: input.issuingOrg,
      issueDate: input.issueDate,
      expirationDate: input.expirationDate ?? null,
      credentialId: input.credentialId ?? null,
      credentialUrl: input.credentialUrl ?? null,
    });
  };

  public remove = async (id: string, profileId: string): Promise<void> => {
    const deleted = await certificationRepository.delete(id, profileId);
    if (deleted === 0) throw new NotFoundError('Certification not found');
  };
}

export const certificationService = new CertificationService();
