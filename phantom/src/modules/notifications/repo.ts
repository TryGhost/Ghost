import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {notificationTable, type NewNotificationRecord, type NotificationRecord} from './db.js';

export type NotificationRepository = {
    listNotifications: () => Promise<NotificationRecord[]>;
    getNotificationById: (id: string) => Promise<NotificationRecord | null>;
    createNotification: (notification: NewNotificationRecord) => Promise<NotificationRecord>;
    deleteNotification: (id: string) => Promise<void>;
};

export const createNotificationRepository = (db: DbClient): NotificationRepository => {
    const listNotifications = async () => db.select().from(notificationTable);

    const getNotificationById = async (id: string) => {
        const rows = await db.select().from(notificationTable).where(eq(notificationTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createNotification = async (notification: NewNotificationRecord) => {
        await db.insert(notificationTable).values(notification);
        const rows = await db
            .select()
            .from(notificationTable)
            .where(eq(notificationTable.id, notification.id))
            .limit(1);
        if (!rows[0]) {
            throw new Error('Notification missing after insert');
        }
        return rows[0];
    };

    const deleteNotification = async (id: string) => {
        await db.delete(notificationTable).where(eq(notificationTable.id, id));
    };

    return {
        listNotifications,
        getNotificationById,
        createNotification,
        deleteNotification
    };
};
