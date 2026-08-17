import {z} from 'zod';
import {camelKeys, snakeKeys} from '../../lib/case-keys';
import {DbGiftLink} from './schema';
import {GiftLink} from './models';

export const GiftLinkRow = DbGiftLink.pick({
    token: true,
    created_at: true
});

export const giftLinkCodec = z.codec(GiftLinkRow, GiftLink, {
    decode: row => camelKeys(row),
    encode: link => snakeKeys(link)
});

export const giftLinkColumns = Object.keys(GiftLinkRow.shape).map(column => `gift_links.${column}`);
