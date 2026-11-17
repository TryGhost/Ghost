import { defineEvent } from '@tryghost/kernel/domains/definitions';
import type { Notice } from '../data/notice.data';

export default defineEvent<Notice>('NoticeRecorded');
