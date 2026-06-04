import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  createLogger,
} from '@linkedin-clone/shared';
import { config } from '../config';
import { Connection, ConnectionStatus } from '../models';
import { connectionRepository } from '../repositories/connection.repository';
import { blockRepository } from '../repositories/block.repository';
import { connectionEventPublisher } from '../events/publishers';

const logger = createLogger(config.SERVICE_NAME);

class ConnectionService {
  /** Load a connection or throw 404. */
  private getOrThrow = async (id: string): Promise<Connection> => {
    const row = await connectionRepository.findById(id);
    if (!row) throw new NotFoundError('Connection request not found');
    return row;
  };

  public list = (userId: string, status?: ConnectionStatus): Promise<Connection[]> => {
    return status
      ? connectionRepository.listByStatus(userId, status)
      : connectionRepository.listAccepted(userId);
  };

  public listPendingIncoming = (userId: string): Promise<Connection[]> => {
    return connectionRepository.listIncomingPending(userId);
  };

  /** Connections shared by the requesting user and another user. */
  public mutual = async (userId: string, otherId: string): Promise<string[]> => {
    if (userId === otherId) return [];
    const [mine, theirs] = await Promise.all([
      connectionRepository.acceptedPartnerIds(userId),
      connectionRepository.acceptedPartnerIds(otherId),
    ]);
    const theirSet = new Set(theirs);
    return mine.filter((id) => theirSet.has(id));
  };

  /** Send a connection request, emitting connection.requested. */
  public request = async (
    requesterId: string,
    addresseeId: string,
    note?: string | null,
  ): Promise<Connection> => {
    if (requesterId === addresseeId) {
      throw new BadRequestError('You cannot connect with yourself');
    }
    if (await blockRepository.existsBetween(requesterId, addresseeId)) {
      throw new ForbiddenError('Connection not allowed');
    }

    const existing = await connectionRepository.findBetween(requesterId, addresseeId);
    if (existing) {
      if (existing.status === 'ACCEPTED') throw new ConflictError('Already connected');
      if (existing.status === 'PENDING') throw new ConflictError('A request is already pending');
      // REJECTED / WITHDRAWN — revive the existing row as a fresh request from this requester.
      const revived = await connectionRepository.update(existing, {
        requesterId,
        addresseeId,
        status: 'PENDING',
        note: note ?? null,
      });
      await connectionEventPublisher.publishRequested({
        connectionId: revived.id,
        requesterId,
        addresseeId,
      });
      return revived;
    }

    const created = await connectionRepository.create({ requesterId, addresseeId, note });
    await connectionEventPublisher.publishRequested({
      connectionId: created.id,
      requesterId,
      addresseeId,
    });
    logger.info({ connectionId: created.id }, 'connection requested');
    return created;
  };

  /** Accept a pending request — only the addressee may accept. */
  public accept = async (id: string, userId: string): Promise<Connection> => {
    const row = await this.getOrThrow(id);
    if (row.addresseeId !== userId) throw new ForbiddenError('Only the addressee can accept');
    if (row.status !== 'PENDING') throw new ConflictError('Request is not pending');

    const updated = await connectionRepository.update(row, { status: 'ACCEPTED' });
    await connectionEventPublisher.publishAccepted({
      connectionId: updated.id,
      requesterId: updated.requesterId,
      addresseeId: updated.addresseeId,
    });
    logger.info({ connectionId: id }, 'connection accepted');
    return updated;
  };

  /** Reject a pending request — only the addressee may reject. */
  public reject = async (id: string, userId: string): Promise<Connection> => {
    const row = await this.getOrThrow(id);
    if (row.addresseeId !== userId) throw new ForbiddenError('Only the addressee can reject');
    if (row.status !== 'PENDING') throw new ConflictError('Request is not pending');
    return connectionRepository.update(row, { status: 'REJECTED' });
  };

  /** Withdraw a request — only the requester may withdraw a pending request. */
  public withdraw = async (id: string, userId: string): Promise<void> => {
    const row = await this.getOrThrow(id);
    const isParticipant = row.requesterId === userId || row.addresseeId === userId;
    if (!isParticipant) throw new ForbiddenError('Not your connection');

    if (row.status === 'PENDING' && row.requesterId === userId) {
      await connectionRepository.update(row, { status: 'WITHDRAWN' });
      return;
    }
    if (row.status === 'ACCEPTED') {
      // Removing an existing connection — either side may do this.
      await connectionRepository.delete(row.id);
      return;
    }
    throw new BadRequestError('Request cannot be withdrawn in its current state');
  };
}

export const connectionService = new ConnectionService();
