/**
 * @fileOverview Schemas and types for the AI consultation flow.
 *
 * - ConsultationInputSchema - The Zod schema for the consultation input.
 * - ConsultationInput - The TypeScript type for the consultation input.
 * - ConsultationOutputSchema - The Zod schema for the consultation output.
 * - ConsultationOutput - The TypeScript type for the consultation output.
 */

import {z} from 'zod';

export const ConsultationInputSchema = z.object({
  fileName: z.string().describe("The name of the 3D model file."),
  technology: z.enum(["fdm", "resin"]).describe("The printing technology used."),
  volume: z.number().describe("The total volume of the model in cm³."),
  surfaceArea: z.number().describe("The surface area of the model in cm²."),
  infillPercentage: z.number().optional().describe("The infill percentage for FDM printing."),
  shellThickness: z.number().optional().describe("The shell thickness for resin printing in mm."),
  estimatedWeight: z.number().describe("The estimated weight of the print in grams."),
  estimatedCost: z.number().describe("The estimated cost of the print in Vietnamese Dong (đ)."),
});
export type ConsultationInput = z.infer<typeof ConsultationInputSchema>;

export const ConsultationOutputSchema = z.object({
  advice: z.string().describe("The detailed advice from the AI assistant, formatted as Markdown."),
});
export type ConsultationOutput = z.infer<typeof ConsultationOutputSchema>;
