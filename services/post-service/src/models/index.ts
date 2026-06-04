import { Post } from './Post';
import { Comment } from './Comment';
import { Reaction } from './Reaction';
import { Hashtag } from './Hashtag';
import { PostHashtag } from './PostHashtag';

// ─── Associations ──────────────────────────────────────────
Post.hasMany(Comment, { foreignKey: 'postId', onDelete: 'CASCADE', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

// Threaded comments (self-referential).
Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'replies' });
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'parent' });

Post.hasMany(Reaction, { foreignKey: 'postId', onDelete: 'CASCADE', as: 'reactions' });
Reaction.belongsTo(Post, { foreignKey: 'postId' });

// Post <-> Hashtag many-to-many through PostHashtag.
Post.belongsToMany(Hashtag, { through: PostHashtag, foreignKey: 'postId', otherKey: 'hashtagId', as: 'hashtags' });
Hashtag.belongsToMany(Post, { through: PostHashtag, foreignKey: 'hashtagId', otherKey: 'postId', as: 'posts' });

export { Post, Comment, Reaction, Hashtag, PostHashtag };
export type { PostType, Visibility } from './Post';
export type { ReactionType } from './Reaction';
