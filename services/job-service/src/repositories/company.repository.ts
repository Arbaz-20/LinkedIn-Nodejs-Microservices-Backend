import { Op } from 'sequelize';
import { Company } from '../models';

export interface CompanyListFilters {
  q?: string;
}

class CompanyRepository {
  public findById = (id: string): Promise<Company | null> => {
    return Company.findByPk(id);
  };

  public findBySlug = (slug: string): Promise<Company | null> => {
    return Company.findOne({ where: { slug } });
  };

  public slugExists = async (slug: string): Promise<boolean> => {
    const count = await Company.count({ where: { slug } });
    return count > 0;
  };

  public create = (data: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    website?: string | null;
    industry?: string | null;
    size?: string | null;
    description?: string | null;
    location?: string | null;
    foundedYear?: number | null;
    adminIds: string[];
  }): Promise<Company> => {
    return Company.create({
      name: data.name,
      slug: data.slug,
      logoUrl: data.logoUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      website: data.website ?? null,
      industry: data.industry ?? null,
      size: data.size ?? null,
      description: data.description ?? null,
      location: data.location ?? null,
      foundedYear: data.foundedYear ?? null,
      adminIds: data.adminIds,
    });
  };

  public update = (row: Company, changes: Partial<Company>): Promise<Company> => {
    return row.update(changes);
  };

  public listAndCount = (
    filters: CompanyListFilters,
    limit: number,
    offset: number,
  ): Promise<{ rows: Company[]; count: number }> => {
    const where = filters.q ? { name: { [Op.iLike]: `%${filters.q}%` } } : {};
    return Company.findAndCountAll({ where, order: [['createdAt', 'DESC']], limit, offset });
  };
}

export const companyRepository = new CompanyRepository();
