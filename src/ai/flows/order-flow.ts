'use server';
/**
 * @fileOverview A flow to process customer orders and generate confirmation messages.
 * 
 * - processOrder - A function that handles the order submission.
 */

import { ai } from '@/ai/genkit';
import { OrderInputSchema, OrderOutputSchema, type OrderInput, type OrderOutput } from '../schema';

export async function processOrder(input: OrderInput): Promise<OrderOutput> {
  const result = await processOrderFlow(input);
  
  // --- SIMULATION: In a real application, you would integrate with an email and SMS service here. ---
  console.log("==================================================");
  console.log(" MÔ PHỎNG GỬI THÔNG BÁO ĐƠN HÀNG");
  console.log("==================================================");
  console.log("\n----- Nội dung Email gửi tới khách hàng -----\n");
  console.log(result.confirmationEmail);
  console.log("\n--------------------------------------------\n");
  console.log("\n----- Nội dung SMS gửi tới khách hàng ------\n");
  console.log(result.confirmationSms);
  console.log("\n--------------------------------------------\n");
  console.log("Lưu ý: Email và SMS chưa được gửi đi thực tế. Đây là phần mô phỏng để bạn kiểm tra nội dung. Để gửi thật, bạn cần tích hợp một dịch vụ như SendGrid (email) hoặc Twilio (SMS) tại đây.");
  console.log("==================================================");
  
  return result;
}

const prompt = ai.definePrompt({
  name: 'orderConfirmationPrompt',
  input: { schema: OrderInputSchema },
  output: { schema: OrderOutputSchema },
  prompt: `
You are an order processing agent for a Vietnamese 3D printing service named "in3D". Your tone must be professional, friendly, and reassuring. All responses must be in Vietnamese.

A customer has just submitted an order. Your task is to generate a confirmation email and a short SMS message.

CUSTOMER AND ORDER DETAILS:
- Customer Name: {{{customerName}}}
- Phone: {{{customerPhone}}}
- Email: {{{customerEmail}}}
- Address: {{{customerAddress}}}

- File Name: {{{orderDetails.fileName}}}
- Technology: {{{orderDetails.technology}}}
- Estimated Weight: {{{orderDetails.estimatedWeight}}} g
- Estimated Cost: {{{orderDetails.estimatedCost}}} đ
{{#if orderDetails.infillPercentage}}
- FDM Infill: {{{orderDetails.infillPercentage}}}%
{{/if}}
{{#if orderDetails.shellThickness}}
- Resin Shell Thickness: {{{orderDetails.shellThickness}}} mm
{{/if}}

TASK 1: GENERATE CONFIRMATION EMAIL
- The email should be formatted in Markdown for the 'confirmationEmail' field.
- Start with a warm greeting (e.g., "Chào anh/chị {{{customerName}}},").
- Thank them for their order with in3D.
- Confirm that the order has been received and is being processed.
- Provide a summary of the order details in a clear, easy-to-read format.
- Mention the total cost.
- Inform them that you will contact them shortly at their phone number ({{{customerPhone}}}) to confirm the order details and discuss payment and delivery.
- End with a professional closing (e.g., "Trân trọng," followed by "Đội ngũ in3D").

TASK 2: GENERATE CONFIRMATION SMS
- The SMS should be a short, concise message for the 'confirmationSms' field.
- It must not exceed 160 characters.
- Example: "in3D cam on ban {{{customerName}}} da dat hang in 3D. Don hang cua ban da duoc tiep nhan. Chung toi se som lien he qua SĐT de xac nhan. Tran trong."
`,
});

const processOrderFlow = ai.defineFlow(
  {
    name: 'processOrderFlow',
    inputSchema: OrderInputSchema,
    outputSchema: OrderOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
