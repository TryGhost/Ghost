// @ts-expect-error This module lacks type definitions.
import DataGenerator from './data-generator';

export const internal = {context: {internal: true}};
export const external = {context: {external: true}};
export const owner = {context: {user: DataGenerator.Content.users[0].id}};
export const admin = {context: {user: DataGenerator.Content.users[1].id}};
export const editor = {context: {user: DataGenerator.Content.users[2].id}};
export const author = {context: {user: DataGenerator.Content.users[3].id}};
export const contributor = {context: {user: DataGenerator.Content.users[7].id}};
export const super_editor = {context: {user: DataGenerator.Content.users[8].id}};
// secretlint-disable-next-line @secretlint/secretlint-rule-pattern
export const admin_api_key = {context: {api_key: DataGenerator.Content.api_keys[0].id}};
// secretlint-disable-next-line @secretlint/secretlint-rule-pattern
export const content_api_key = {context: {api_key: DataGenerator.Content.api_keys[1].id}};
