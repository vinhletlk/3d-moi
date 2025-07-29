/**
 * @fileOverview Schemas and types for the AI consultation flow.
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
  userPrompt: z.string().optional().describe("A specific question or prompt from the user for the AI to answer."),
});
export type ConsultationInput = z.infer<typeof ConsultationInputSchema>;

export const ConsultationOutputSchema = z.object({
  advice: z.string().describe("The detailed advice from the AI assistant, formatted as Markdown."),
  suggestedInfill: z.number().optional().describe("The suggested infill percentage for FDM, if applicable."),
  suggestedShellThickness: z.number().optional().describe("The suggested shell thickness in mm for Resin, if applicable."),
});
export type ConsultationOutput = z.infer<typeof ConsultationOutputSchema>;

export const OrderInputSchema = z.object({
    customerName: z.string().min(2, { message: "Họ tên phải có ít nhất 2 ký tự." }),
    customerAddress: z.string().min(10, { message: "Địa chỉ phải có ít nhất 10 ký tự." }),
    orderDetails: ConsultationInputSchema.optional(),
});
export type OrderInput = z.infer<typeof OrderInputSchema>;

// This schema is no longer used for generating confirmations, but we keep a simple one
// in case we want to add back AI processing later.
export const OrderOutputSchema = z.object({
    internalNote: z.string().describe("An internal note for the order processing team."),
});
export type OrderOutput = z.infer<typeof OrderOutputSchema>;
