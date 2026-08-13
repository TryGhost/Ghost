import {z} from 'zod';
import {camelKeys, snakeKeys} from '../../lib/case-keys';
import {DbGiftDelivery, GiftDeliveryDataSchema, type GiftDeliveryData} from './gift-delivery-schema';

export const giftDeliveryCodec = z.codec(DbGiftDelivery, GiftDeliveryDataSchema, {
    decode: row => camelKeys(row),
    encode: delivery => snakeKeys(delivery)
});

export function decodeGiftDeliveryRow(input: unknown): GiftDeliveryData {
    return giftDeliveryCodec.parse(input);
}

export function encodeGiftDelivery(delivery: GiftDeliveryData): z.output<typeof DbGiftDelivery> {
    const row = z.encode(giftDeliveryCodec, delivery);

    return DbGiftDelivery.parse(row);
}
