/**
 * Utility functions for session storage and ID management
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Get a session ID from storage
 * 
 * @param {string} key - The storage key
 * @param {Storage} storage - The storage object (localStorage or sessionStorage)
 * @returns {string|null} Session ID if valid, null otherwise
 */
export function getSessionId(key, storage) {
    const serializedItem = storage.getItem(key);
    
    if (!serializedItem) {
        return null;
    }
    
    let item = null;
    try {
        item = JSON.parse(serializedItem);
    } catch (error) {
        return null;
    }
    
    if (typeof item !== 'object' || item === null) {
        return null;
    }
    
    const now = new Date();
    if (now.getTime() > item.expiry) {
        storage.removeItem(key);
        return null;
    }
    
    return item.value;
}

/**
 * Set or create a session ID in storage
 * 
 * @param {string} key - The storage key
 * @param {Storage} storage - The storage object (localStorage or sessionStorage)
 * @param {number} [ttlHours=4] - Time to live in hours
 * @returns {string} The session ID
 */
export function setSessionId(key, storage, ttlHours = 4) {
    const sessionId = getSessionId(key, storage) || uuidv4();
    const now = new Date();
    const item = {
        value: sessionId,
        expiry: now.getTime() + (ttlHours * 3600 * 1000)
    };
    
    storage.setItem(key, JSON.stringify(item));
    return sessionId;
}

/**
 * Get the appropriate storage object based on preference
 * 
 * @param {string} method - Storage method ('localStorage' or 'sessionStorage')
 * @returns {Storage} The storage object
 */
export function getStorageObject(method) {
    return method === 'localStorage' ? localStorage : sessionStorage;
} 