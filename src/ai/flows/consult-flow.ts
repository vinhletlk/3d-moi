'use server';
/**
 * @fileOverview An AI flow to provide advice on 3D printing settings.
 *
 * - consultAI - A function that provides 3D printing advice.
 */

import {ai} from '@/ai/genkit';
import { ConsultationInputSchema, ConsultationOutputSchema, type ConsultationInput, type ConsultationOutput } from '../schema';

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

Based on this information, provide a concise and actionable consultation. Structure your response in Markdown in the "advice" field.

Also, analyze the suggestions and if you provide a SPECIFIC NUMERIC suggestion for infill or shell thickness, populate the corresponding output fields. For example, if you suggest "Giảm độ rỗng xuống 15%", you must set the 'suggestedInfill' field to 15. If you suggest reducing shell thickness to 1.8mm, you must set 'suggestedShellThickness' to 1.8. If no specific numeric suggestion is made, leave these fields empty.

### Phân tích nhanh
- Briefly analyze the provided stats. For example, comment on whether the volume/weight is large or small for the chosen technology. Mention the relationship between the settings (e.g., infill/shell thickness) and the final cost/weight.

### Đề xuất tối ưu
- Provide specific, actionable suggestions for optimization.
- If FDM:
  - Suggest adjusting the infill percentage. Explain the trade-offs (e.g., "Giảm độ rỗng xuống 15% có thể tiết kiệm chi phí nhưng sẽ làm giảm độ bền. Mức 20% là một sự cân bằng tốt cho các mô hình trưng bày.").
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
