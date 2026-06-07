import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

type MediaStatus = 'PROCESSING' | 'READY' | 'FAILED';

/** Metadata for an uploaded object stored in MinIO. */
class Media extends Model<InferAttributes<Media>, InferCreationAttributes<Media>> {
  declare id: CreationOptional<string>;
  declare uploaderId: string;
  declare fileName: string;
  declare mimeType: string;
  declare size: number;
  declare url: string;
  declare thumbnailUrl: string | null;
  declare bucket: CreationOptional<string>;
  declare key: string;
  declare width: number | null;
  declare height: number | null;
  declare status: CreationOptional<MediaStatus>;
  declare createdAt: CreationOptional<Date>;
}

Media.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    uploaderId: { type: DataTypes.UUID, allowNull: false, field: 'uploader_id' },
    fileName: { type: DataTypes.STRING, allowNull: false, field: 'file_name' },
    mimeType: { type: DataTypes.STRING, allowNull: false, field: 'mime_type' },
    size: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    thumbnailUrl: { type: DataTypes.STRING, allowNull: true, field: 'thumbnail_url' },
    bucket: { type: DataTypes.STRING, allowNull: false, defaultValue: 'uploads' },
    key: { type: DataTypes.STRING, allowNull: false, unique: true },
    width: { type: DataTypes.INTEGER, allowNull: true },
    height: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.ENUM('PROCESSING', 'READY', 'FAILED'),
      allowNull: false,
      defaultValue: 'PROCESSING',
    },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'media',
    updatedAt: false,
    indexes: [{ fields: ['uploader_id'] }],
  },
);

export { Media };
export type { MediaStatus };
