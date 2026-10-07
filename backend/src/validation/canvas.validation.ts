import { z } from 'zod';

const colorRegex = /^#[0-9A-Fa-f]{3,8}$|^rgba?\(.*\)$|^[a-zA-Z]+$/;

const baseElementSchema = z.object({
  id: z.string().min(1, 'Element ID is required'),
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite().default(0),
  fill: z.string().regex(colorRegex, 'Invalid color value'),
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().optional().default(true),
  locked: z.boolean().optional().default(false),
  stroke: z.string().regex(colorRegex, 'Invalid stroke color').optional(),
  strokeWidth: z.number().min(0).max(100).optional().default(0),
  shadowColor: z.string().regex(colorRegex, 'Invalid shadow color').optional(),
  shadowBlur: z.number().min(0).max(100).optional().default(0),
  shadowOffsetX: z.number().finite().optional().default(0),
  shadowOffsetY: z.number().finite().optional().default(0),
});

const rectElementSchema = baseElementSchema.extend({
  type: z.literal('rect'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  cornerRadius: z.number().min(0).max(500).optional().default(0),
});

const circleElementSchema = baseElementSchema.extend({
  type: z.literal('circle'),
  radius: z.number().positive('Radius must be positive'),
});

const textElementSchema = baseElementSchema.extend({
  type: z.literal('text'),
  text: z.string().min(1, 'Text content is required'),
  fontSize: z.number().min(1).max(500),
  width: z.number().positive('Width must be positive'),
});

export const canvasElementSchema = z.discriminatedUnion('type', [
  rectElementSchema,
  circleElementSchema,
  textElementSchema,
]);

const artboardSchema = z.object({
  width: z.number().min(100).max(10000),
  height: z.number().min(100).max(10000),
});

export const createCanvasSchema = z.object({
  name: z.string().min(1, 'Canvas name is required').max(200, 'Name too long').trim(),
  artboard: artboardSchema.optional().default({ width: 1200, height: 800 }),
  elements: z.array(canvasElementSchema).optional().default([]),
});

export const updateCanvasSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  artboard: artboardSchema.optional(),
  elements: z.array(canvasElementSchema).optional(),
  version: z.number().int().positive().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid canvas ID');
