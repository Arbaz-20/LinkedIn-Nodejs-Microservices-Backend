import { ForbiddenError, NotFoundError, createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { Company } from '../models';
import { companyRepository } from '../repositories/company.repository';
import type { CreateCompanyInput, UpdateCompanyInput } from '../validators/job.validators';
import type { OffsetPaginationParams } from '@linkedin-clone/shared';

const logger = createLogger(config.SERVICE_NAME);

class CompanyService {
  public getByIdOrThrow = async (id: string): Promise<Company> => {
    const company = await companyRepository.findById(id);
    if (!company) throw new NotFoundError('Company not found');
    return company;
  };

  public getBySlug = async (slug: string): Promise<Company> => {
    const company = await companyRepository.findBySlug(slug);
    if (!company) throw new NotFoundError('Company not found');
    return company;
  };

  public list = (
    filters: { q?: string },
    params: OffsetPaginationParams,
  ): Promise<{ rows: Company[]; count: number }> => {
    return companyRepository.listAndCount(filters, params.limit, params.offset);
  };

  /** True if the user administers the company or holds the ADMIN role. */
  public isAdmin = (company: Company, userId: string, role: string): boolean => {
    return role === 'ADMIN' || company.adminIds.includes(userId);
  };

  public assertAdmin = (company: Company, userId: string, role: string): void => {
    if (!this.isAdmin(company, userId, role)) {
      throw new ForbiddenError('Only a company admin may perform this action');
    }
  };

  public create = async (userId: string, input: CreateCompanyInput): Promise<Company> => {
    const slug = await this.resolveSlug(input.slug, input.name);
    const company = await companyRepository.create({
      name: input.name,
      slug,
      logoUrl: input.logoUrl,
      bannerUrl: input.bannerUrl,
      website: input.website,
      industry: input.industry,
      size: input.size,
      description: input.description,
      location: input.location,
      foundedYear: input.foundedYear,
      adminIds: [userId],
    });
    logger.info({ companyId: company.id }, 'company created');
    return company;
  };

  public update = async (
    id: string,
    userId: string,
    role: string,
    input: UpdateCompanyInput,
  ): Promise<Company> => {
    const company = await this.getByIdOrThrow(id);
    this.assertAdmin(company, userId, role);
    return companyRepository.update(company, input);
  };

  /** Build a unique slug: use provided slug or slugify the name, append a suffix if taken. */
  private resolveSlug = async (provided: string | undefined, name: string): Promise<string> => {
    const base = this.slugify(provided ?? name) || 'company';
    if (!(await companyRepository.slugExists(base))) return base;
    for (let i = 0; i < 5; i += 1) {
      const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      if (!(await companyRepository.slugExists(candidate))) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  };

  private slugify = (value: string): string => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 140);
  };
}

export const companyService = new CompanyService();
