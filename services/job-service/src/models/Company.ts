import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** An employer/company profile that owns job postings. */
class Company extends Model<InferAttributes<Company>, InferCreationAttributes<Company>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare slug: string;
  declare logoUrl: string | null;
  declare bannerUrl: string | null;
  declare website: string | null;
  declare industry: string | null;
  declare size: string | null;
  declare description: string | null;
  declare location: string | null;
  declare foundedYear: number | null;
  declare adminIds: CreationOptional<string[]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Company.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    logoUrl: { type: DataTypes.STRING, allowNull: true, field: 'logo_url' },
    bannerUrl: { type: DataTypes.STRING, allowNull: true, field: 'banner_url' },
    website: { type: DataTypes.STRING, allowNull: true },
    industry: { type: DataTypes.STRING, allowNull: true },
    size: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    foundedYear: { type: DataTypes.INTEGER, allowNull: true, field: 'founded_year' },
    adminIds: { type: DataTypes.ARRAY(DataTypes.UUID), allowNull: false, defaultValue: [], field: 'admin_ids' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'companies',
    indexes: [{ unique: true, fields: ['slug'] }],
  },
);

export { Company };
