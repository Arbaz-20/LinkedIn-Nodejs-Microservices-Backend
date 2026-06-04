import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

class Comment extends Model<InferAttributes<Comment>, InferCreationAttributes<Comment>> {
  declare id: CreationOptional<string>;
  declare postId: string;
  declare authorId: string;
  declare parentId: string | null;
  declare content: string;
  declare likesCount: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Comment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    postId: { type: DataTypes.UUID, allowNull: false, field: 'post_id' },
    authorId: { type: DataTypes.UUID, allowNull: false, field: 'author_id' },
    parentId: { type: DataTypes.UUID, allowNull: true, field: 'parent_id' },
    content: { type: DataTypes.TEXT, allowNull: false },
    likesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'likes_count' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'comments',
    indexes: [
      { fields: ['post_id', 'created_at'] },
      { fields: ['parent_id'] },
    ],
  },
);

export { Comment };
