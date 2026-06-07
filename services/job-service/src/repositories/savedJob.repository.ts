import { Job, SavedJob } from '../models';

class SavedJobRepository {
  public findOrCreate = async (
    userId: string,
    jobId: string,
  ): Promise<{ saved: SavedJob; created: boolean }> => {
    const [saved, created] = await SavedJob.findOrCreate({ where: { userId, jobId }, defaults: { userId, jobId } });
    return { saved, created };
  };

  public remove = (userId: string, jobId: string): Promise<number> => {
    return SavedJob.destroy({ where: { userId, jobId } });
  };

  /** A user's saved jobs with the job included, newest first. */
  public listByUser = (userId: string): Promise<SavedJob[]> => {
    return SavedJob.findAll({
      where: { userId },
      include: [{ model: Job, as: 'job' }],
      order: [['createdAt', 'DESC']],
    });
  };
}

export const savedJobRepository = new SavedJobRepository();
