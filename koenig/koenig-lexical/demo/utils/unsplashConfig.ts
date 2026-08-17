const API_VERSION = 'v1';
const API_TOKEN = '8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980';

export const defaultHeaders = {
    Authorization: `Client-ID ${API_TOKEN}`,
    'Accept-Version': API_VERSION,
    'Content-Type': 'application/json',
    'App-Pragma': 'no-cache',
    'X-Unsplash-Cache': true
};
