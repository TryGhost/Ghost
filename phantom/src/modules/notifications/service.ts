import {randomUUID} from 'node:crypto';
import type {
    NotificationCreateRequest,
    NotificationCreateResponse,
    NotificationListResponse,
    NotificationResponse
} from './contracts.js';
import type {NotificationRecord} from './db.js';
import type {NotificationRepository} from './repo.js';
import {HttpError} from '../../platform/http/errors.js';

const normalizeNotification = (record: NotificationRecord): NotificationResponse => {
    return {
        id: record.id,
        type: record.type === 'system' ? 'system' : 'admin',
        title: record.title,
        message: record.message,
        status: record.status === 'resolved' ? 'resolved' : 'active',
        createdBy: record.createdBy ?? null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
    };
};

export type NotificationService = {
    listNotifications: () => Promise<NotificationListResponse>;
    createNotification: (staffId: string, input: NotificationCreateRequest) => Promise<NotificationCreateResponse>;
    createSystemNotification: (input: {title: string; message: string}) => Promise<NotificationResponse>;
    deleteNotification: (id: string) => Promise<void>;
};

export const createNotificationService = (repository: NotificationRepository): NotificationService => {
    const listNotifications = async () => {
        const notifications = await repository.listNotifications();
        return {
            notifications: notifications
                .map(normalizeNotification)
                .sort((left, right) => right.createdAt - left.createdAt)
        };
    };

    const createNotification = async (staffId: string, input: NotificationCreateRequest) => {
        if (!staffId) {
            throw new HttpError(422, 'notification_missing_staff', 'Staff id is required');
        }
        const now = Date.now();
        const notification = await repository.createNotification({
            id: randomUUID(),
            type: 'admin',
            title: input.title,
            message: input.message,
            status: input.status ?? 'active',
            createdBy: staffId,
            createdAt: now,
            updatedAt: now
        });

        return {notification: normalizeNotification(notification)};
    };

    const createSystemNotification = async (input: {title: string; message: string}) => {
        const now = Date.now();
        const notification = await repository.createNotification({
            id: randomUUID(),
            type: 'system',
            title: input.title,
            message: input.message,
            status: 'active',
            createdBy: null,
            createdAt: now,
            updatedAt: now
        });

        return normalizeNotification(notification);
    };

    const deleteNotification = async (id: string) => {
        const existing = await repository.getNotificationById(id);
        if (!existing) {
            throw new HttpError(404, 'notification_not_found', 'Notification not found');
        }
        await repository.deleteNotification(id);
    };

    return {
        listNotifications,
        createNotification,
        createSystemNotification,
        deleteNotification
    };
};
