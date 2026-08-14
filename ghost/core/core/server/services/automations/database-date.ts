import moment from 'moment';

const DATABASE_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const toDatabaseDate = (date: Date | string): string => moment(date).format(DATABASE_DATE_FORMAT);
