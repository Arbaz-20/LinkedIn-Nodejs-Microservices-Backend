import { Op, WhereOptions } from 'sequelize';
import { Company, Job } from '../models';

export interface JobListFilters {
  q?: string;
  location?: string;
  employmentType?: Job['employmentType'];
  experienceLevel?: Job['experienceLevel'];
  locationType?: Job['locationType'];
  companyId?: string;
}

class JobRepository {
  public findById = (id: string): Promise<Job | null> => {
    return Job.findByPk(id);
  };

  public findByIdWithCompany = (id: string): Promise<Job | null> => {
    return Job.findByPk(id, { include: [{ model: Company, as: 'company' }] });
  };

  public create = (data: {
    companyId: string;
    posterId: string;
    title: string;
    description: string;
    location?: string | null;
    locationType?: Job['locationType'];
    employmentType: Job['employmentType'];
    experienceLevel: Job['experienceLevel'];
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency?: string | null;
    skills?: string[];
  }): Promise<Job> => {
    return Job.create({
      companyId: data.companyId,
      posterId: data.posterId,
      title: data.title,
      description: data.description,
      location: data.location ?? null,
      locationType: data.locationType,
      employmentType: data.employmentType,
      experienceLevel: data.experienceLevel,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      salaryCurrency: data.salaryCurrency,
      skills: data.skills ?? [],
    });
  };

  public update = (row: Job, changes: Partial<Job>): Promise<Job> => {
    return row.update(changes);
  };

  /** Active jobs matching filters, offset paginated, newest first. */
  public listAndCount = (
    filters: JobListFilters,
    limit: number,
    offset: number,
  ): Promise<{ rows: Job[]; count: number }> => {
    const where: WhereOptions = { isActive: true };
    if (filters.q) Object.assign(where, { title: { [Op.iLike]: `%${filters.q}%` } });
    if (filters.location) Object.assign(where, { location: { [Op.iLike]: `%${filters.location}%` } });
    if (filters.employmentType) Object.assign(where, { employmentType: filters.employmentType });
    if (filters.experienceLevel) Object.assign(where, { experienceLevel: filters.experienceLevel });
    if (filters.locationType) Object.assign(where, { locationType: filters.locationType });
    if (filters.companyId) Object.assign(where, { companyId: filters.companyId });

    return Job.findAndCountAll({
      where,
      include: [{ model: Company, as: 'company' }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
  };

  public incrementApplicants = async (id: string, by = 1): Promise<void> => {
    await Job.increment('applicantsCount', { by, where: { id } });
  };
}

export const jobRepository = new JobRepository();
