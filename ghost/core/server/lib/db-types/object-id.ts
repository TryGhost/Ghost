import ObjectId from 'bson-objectid';
import { z } from 'zod';

export const ObjectIdSchema = z.string().refine((value) => ObjectId.isValid(value));
