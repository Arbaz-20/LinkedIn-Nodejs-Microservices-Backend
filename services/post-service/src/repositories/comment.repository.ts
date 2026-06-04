import { Op } from 'sequelize';
import { Comment } from '../models';

class CommentRepository {
  public findById = (id: string): Promise<Comment | null> => {
    return Comment.findByPk(id);
  };

  /** Top-level comments for a post with their immediate replies, newest first. */
  public listThreaded = (postId: string, limit: number, cursor?: string): Promise<Comment[]> => {
    return Comment.findAll({
      where: {
        postId,
        parentId: null,
        ...(cursor ? { createdAt: { [Op.lt]: new Date(cursor) } } : {}),
      },
      include: [{ model: Comment, as: 'replies', separate: true, order: [['createdAt', 'ASC']] }],
      order: [['createdAt', 'DESC']],
      limit: limit + 1,
    });
  };

  public create = (data: {
    postId: string;
    authorId: string;
    content: string;
    parentId?: string | null;
  }): Promise<Comment> => {
    return Comment.create({
      postId: data.postId,
      authorId: data.authorId,
      content: data.content,
      parentId: data.parentId ?? null,
    });
  };

  public update = (row: Comment, changes: Partial<Comment>): Promise<Comment> => {
    return row.update(changes);
  };

  public delete = (id: string): Promise<number> => {
    return Comment.destroy({ where: { id } });
  };

  /** Count a comment plus its direct replies (used to fix the post counter on delete). */
  public countWithReplies = async (id: string): Promise<number> => {
    const replies = await Comment.count({ where: { parentId: id } });
    return replies + 1;
  };
}

export const commentRepository = new CommentRepository();
