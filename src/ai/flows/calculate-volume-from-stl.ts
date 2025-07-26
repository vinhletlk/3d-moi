'use server';
/**
 * @fileOverview STL file volume calculation flow.
 *
 * - calculateVolume - A function that calculates the volume of an STL file.
 * - CalculateVolumeInput - The input type for the calculateVolume function.
 * - CalculateVolumeOutput - The return type for the calculateVolume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {StlParser} from '@/lib/stl-parser';

const CalculateVolumeInputSchema = z.object({
  stlDataUri: z
    .string()
    .describe(
      "An STL file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type CalculateVolumeInput = z.infer<typeof CalculateVolumeInputSchema>;

const CalculateVolumeOutputSchema = z.object({
  volume: z.number().describe('The volume of the STL model in cubic centimeters.'),
  surfaceArea: z
    .number()
    .describe('The surface area of the STL model in square centimeters.'),
});
export type CalculateVolumeOutput = z.infer<typeof CalculateVolumeOutputSchema>;

export async function calculateVolume(input: CalculateVolumeInput): Promise<CalculateVolumeOutput> {
  return calculateVolumeFlow(input);
}

const calculateVolumeFlow = ai.defineFlow(
  {
    name: 'calculateVolumeFlow',
    inputSchema: CalculateVolumeInputSchema,
    outputSchema: CalculateVolumeOutputSchema,
  },
  async input => {
    const stlData = input.stlDataUri.split(',')[1];
    if (!stlData) {
      throw new Error('Invalid STL data URI.');
    }

    const stlBuffer = Buffer.from(stlData, 'base64');
    const parser = new StlParser();
    const {volume, surfaceArea} = parser.parse(stlBuffer);

    return {
      volume: volume,
      surfaceArea: surfaceArea,
    };
  }
);
