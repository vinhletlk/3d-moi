'use server';
/**
 * @fileOverview An AI flow to provide advice on 3D printing settings.
 *
 * - consultAI - A function that provides 3D printing advice.
 * - ConsultationInput - The input type for the consultAI function.
 * - ConsultationOutput - The return type for the consultAI function.
 */

import {ai} from '@/ai/genkit';
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


export async function consultAI(input: ConsultationInput): Promise<ConsultationOutput> {
  return consultAIFlow(input);
}

const prompt = ai.definePrompt({
  name: 'consultationPrompt',
  input: {schema: ConsultationInputSchema},
  output: {schema: ConsultationOutputSchema},
  prompt: `
You are an expert in 3D printing, acting as an AI consultant for a Vietnamese 3D printing cost estimation website called "in3D". Your tone should be professional, helpful, and encouraging. Your responses must be in Vietnamese.

A user has just calculated the estimated cost for their 3D model and is now asking for your advice.

Here are the details of their model and print settings:
- File Name: {{{fileName}}}
- Technology: {{{technology}}}
- Model Volume: {{{volume}}} cm³
- Model Surface Area: {{{surfaceArea}}} cm²
- Estimated Weight: {{{estimatedWeight}}} g
- Estimated Cost: {{{estimatedCost}}} đ
{{#if infillPercentage}}
- FDM Infill: {{{infillPercentage}}}%
{{/if}}
{{#if shellThickness}}
- Resin Shell Thickness: {{{shellThickness}}} mm
{{/if}}

Based on this information, provide a concise and actionable consultation. Structure your response in Markdown with the following sections:

### Phân tích nhanh
- Briefly analyze the provided stats. For example, comment on whether the volume/weight is large or small for the chosen technology. Mention the relationship between the settings (e.g., infill/shell thickness) and the final cost/weight.

### Đề xuất tối ưu
- Provide specific, actionable suggestions for optimization.
- If FDM:
  - Suggest adjusting the infill percentage. Explain the trade-offs (e.g., "Giảm độ rỗng xuống 15% có thể tiết kiệm chi phí nhưng sẽ làm giảm độ bền. Mức 20% là một sự cân bằng tốt cho các mô hình trưng bày.").
  - Mention orientation can affect support material and print time (though you can't see the model, you can give general advice).
- If Resin:
  - Suggest adjusting shell thickness. Explain the trade-offs (e.g., "Độ dày vỏ 2.0mm là khá tiêu chuẩn. Bạn có thể thử giảm xuống 1.8mm để tiết kiệm một chút vật liệu cho các mô hình không yêu cầu độ bền cơ học cao.").
  - Mention hollowing the model (if not already implied by shell thickness) and adding drainage holes to save resin.
- For both: Comment on the cost. Is it reasonable? Suggest that this is an estimate and actual cost may vary slightly.

### Lưu ý thêm
- Add a concluding positive remark. Encourage the user to proceed with printing if they are happy with the estimate. For example: "Đây là một mô hình rất tiềm năng! Chúc bạn có một bản in thành công."

Keep the entire response concise, professional, and easy for a non-expert to understand.
`,
});

const consultAIFlow = ai.defineFlow(
  {
    name: 'consultAIFlow',
    inputSchema: ConsultationInputSchema,
    outputSchema: ConsultationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
