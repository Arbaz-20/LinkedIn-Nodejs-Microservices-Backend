import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

class Certification extends Model<
  InferAttributes<Certification>,
  InferCreationAttributes<Certification>
> {
  declare id: CreationOptional<string>;
  declare profileId: string;
  declare name: string;
  declare issuingOrg: string;
  declare issueDate: Date;
  declare expirationDate: Date | null;
  declare credentialId: string | null;
  declare credentialUrl: string | null;
}

Certification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    profileId: { type: DataTypes.UUID, allowNull: false, field: 'profile_id' },
    name: { type: DataTypes.STRING, allowNull: false },
    issuingOrg: { type: DataTypes.STRING, allowNull: false, field: 'issuing_org' },
    issueDate: { type: DataTypes.DATE, allowNull: false, field: 'issue_date' },
    expirationDate: { type: DataTypes.DATE, allowNull: true, field: 'expiration_date' },
    credentialId: { type: DataTypes.STRING, allowNull: true, field: 'credential_id' },
    credentialUrl: { type: DataTypes.STRING, allowNull: true, field: 'credential_url' },
  },
  {
    sequelize,
    tableName: 'certifications',
    timestamps: false,
    indexes: [{ fields: ['profile_id'] }],
  },
);

export { Certification };
