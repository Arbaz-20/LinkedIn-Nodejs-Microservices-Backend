import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

type PostType = 'POST' | 'ARTICLE' | 'POLL' | 'SHARE' | 'CELEBRATION';
type Visibility = 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE';

class Post extends Model<InferAttributes<Post>, InferCreationAttributes<Post>> {
  declare id: CreationOptional<string>;
  declare authorId: string;
  declare content: string;
  declare mediaUrls: CreationOptional<string[]>;
  declare postType: CreationOptional<PostType>;
  declare visibility: CreationOptional<Visibility>;
  declare isEdited: CreationOptional<boolean>;
  declare likesCount: CreationOptional<number>;
  declare commentsCount: CreationOptional<number>;
  declare sharesCount: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: Date | null;
}

Post.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    authorId: { type: DataTypes.UUID, allowNull: false, field: 'author_id' },
    content: { type: DataTypes.TEXT, allowNull: false },
    mediaUrls: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [], field: 'media_urls' },
    postType: {
      type: DataTypes.ENUM('POST', 'ARTICLE', 'POLL', 'SHARE', 'CELEBRATION'),
      allowNull: false,
      defaultValue: 'POST',
      field: 'post_type',
    },
    visibility: {
      type: DataTypes.ENUM('PUBLIC', 'CONNECTIONS', 'PRIVATE'),
      allowNull: false,
      defaultValue: 'PUBLIC',
    },
    isEdited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_edited' },
    likesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'likes_count' },
    commentsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'comments_count' },
    sharesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'shares_count' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    tableName: 'posts',
    indexes: [
      { fields: ['author_id', 'created_at'] },
      { fields: ['created_at'] },
    ],
  },
);

export { Post };
export type { PostType, Visibility };
