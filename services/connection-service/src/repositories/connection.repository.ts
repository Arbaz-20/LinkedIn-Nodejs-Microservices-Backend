import { Op, WhereOptions } from 'sequelize';
import { Connection, ConnectionStatus } from '../models';

class ConnectionRepository {
  public findById = (id: string): Promise<Connection | null> => {
    return Connection.findByPk(id);
  };

  /** The connection row between two users regardless of direction, if any. */
  public findBetween = (a: string, b: string): Promise<Connection | null> => {
    return Connection.findOne({
      where: {
        [Op.or]: [
          { requesterId: a, addresseeId: b },
          { requesterId: b, addresseeId: a },
        ],
      },
    });
  };

  public create = (data: {
    requesterId: string;
    addresseeId: string;
    note?: string | null;
  }): Promise<Connection> => {
    return Connection.create({
      requesterId: data.requesterId,
      addresseeId: data.addresseeId,
      note: data.note ?? null,
    });
  };

  public update = (row: Connection, changes: Partial<Connection>): Promise<Connection> => {
    return row.update(changes);
  };

  public delete = (id: string): Promise<number> => {
    return Connection.destroy({ where: { id } });
  };

  /** Accepted connections involving a user (either side). */
  public listAccepted = (userId: string): Promise<Connection[]> => {
    return Connection.findAll({
      where: {
        status: 'ACCEPTED',
        [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
      },
      order: [['updatedAt', 'DESC']],
    });
  };

  /** Connections for a user filtered by status (either side). */
  public listByStatus = (userId: string, status: ConnectionStatus): Promise<Connection[]> => {
    const where: WhereOptions = {
      status,
      [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
    };
    return Connection.findAll({ where, order: [['updatedAt', 'DESC']] });
  };

  /** Pending requests addressed TO the user (incoming). */
  public listIncomingPending = (userId: string): Promise<Connection[]> => {
    return Connection.findAll({
      where: { addresseeId: userId, status: 'PENDING' },
      order: [['createdAt', 'DESC']],
    });
  };

  /** The set of user ids a given user is connected to (accepted). */
  public acceptedPartnerIds = async (userId: string): Promise<string[]> => {
    const rows = await this.listAccepted(userId);
    return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  };
}

export const connectionRepository = new ConnectionRepository();
