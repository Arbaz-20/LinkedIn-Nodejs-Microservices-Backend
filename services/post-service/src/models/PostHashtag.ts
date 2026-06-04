import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** Join row between a post and a hashtag. */
class PostHashtag extends Model<InferAttributes<PostHashtag>, InferCreationAttributes<PostHashtag>> {
  declare postId: string;
  declare hashtagId: string;
}

PostHashtag.init(
  {
    postId: { type: DataTypes.UUID, primaryKey: true, field: 'post_id' },
    hashtagId: { type: DataTypes.UUID, primaryKey: true, field: 'hashtag_id' },
  },
  {
    sequelize,
    tableName: 'post_hashtags',
    timestamps: false,
  },
);

export { PostHashtag };
