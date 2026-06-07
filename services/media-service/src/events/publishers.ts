import { publishEvent, EXCHANGES, ROUTING_KEYS } from '@linkedin-clone/shared';
import { config } from '../config';

export interface MediaProcessingEvent {
  mediaId: string;
  key: string;
  bucket: string;
}

class MediaEventPublisher {
  /** Request an image resize for the given object. */
  public publishResize = async (data: MediaProcessingEvent): Promise<void> => {
    await publishEvent(
      EXCHANGES.MEDIA_PROCESSING,
      ROUTING_KEYS.MEDIA_RESIZE,
      data,
      config.SERVICE_NAME,
    );
  };

  /** Request a thumbnail for the given object. */
  public publishThumbnail = async (data: MediaProcessingEvent): Promise<void> => {
    await publishEvent(
      EXCHANGES.MEDIA_PROCESSING,
      ROUTING_KEYS.MEDIA_THUMBNAIL,
      data,
      config.SERVICE_NAME,
    );
  };
}

export const mediaEventPublisher = new MediaEventPublisher();
