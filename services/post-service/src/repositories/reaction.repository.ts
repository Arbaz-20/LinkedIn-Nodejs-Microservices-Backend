import { Reaction, ReactionType } from '../models';

class ReactionRepository {
  public find = (postId: string, userId: string): Promise<Reaction | null> => {
    return Reaction.findOne({ where: { postId, userId } });
  };

  public create = (postId: string, userId: string, type: ReactionType): Promise<Reaction> => {
    return Reaction.create({ postId, userId, type });
  };

  public updateType = (row: Reaction, type: ReactionType): Promise<Reaction> => {
    return row.update({ type });
  };

  public delete = (postId: string, userId: string): Promise<number> => {
    return Reaction.destroy({ where: { postId, userId } });
  };
}

export const reactionRepository = new ReactionRepository();
