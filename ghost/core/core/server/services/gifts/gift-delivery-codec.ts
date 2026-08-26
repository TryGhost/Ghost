import { camelKeys, snakeKeys } from '../../lib/case-keys';
import {
  DbGiftDelivery,
  type GiftDeliveryData,
  type GiftDeliveryRow,
} from './gift-delivery-schema';

export function decodeGiftDeliveryRow(input: unknown): GiftDeliveryData {
  return camelKeys(DbGiftDelivery.parse(input));
}

export function encodeGiftDelivery(delivery: GiftDeliveryData): GiftDeliveryRow {
  return DbGiftDelivery.parse(snakeKeys(delivery));
}
