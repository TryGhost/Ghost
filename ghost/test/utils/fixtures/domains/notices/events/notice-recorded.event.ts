import { defineEvent } from '../../../../../../core/kernel/domains/definitions';
import type { Notice } from '../data/notice.data';

export default defineEvent<Notice>('NoticeRecorded');
