'use server';
/**
 * @fileOverview A flow to process customer orders and generate confirmation messages.
 * 
 * - processOrder - A function that handles the order submission.
 */
import { ai } from '@/ai/genkit';
import { OrderInputSchema, OrderOutputSchema, type OrderInput, type OrderOutput } from '../schema';
import { Resend } from 'resend';

export async function processOrder(input: OrderInput): Promise<OrderOutput> {
  const result = await processOrderFlow(input);
  
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping actual email sending.");
    console.log("==================================================");
    console.log(" MÔ PHỎNG GỬI THÔNG BÁO ĐƠN HÀNG (API Key chưa được cấu hình)");
    console.log("==================================================");
    console.log("\n----- Nội dung Email sẽ gửi tới khách hàng -----\n");
    console.log(result.confirmationEmail);
    console.log("\n--------------------------------------------\n");
    console.log("Lưu ý: Để gửi email thật, hãy thêm RESEND_API_KEY vào tệp .env");
    console.log("==================================================");
    return result;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'in3D <onboarding@resend.dev>', // Replace with your verified domain if you have one
      to: [input.customerEmail],
      subject: 'Xác nhận đơn hàng in 3D từ in3D',
      html: result.confirmationEmail.replace(/\n/g, '<br>'), // Basic Markdown to HTML
    });
    console.log(`Confirmation email sent to ${input.customerEmail}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    // Even if email fails, we don't want to block the user.
    // In a real-world scenario, you might add more robust error handling or retry logic.
  }
  
  // SMS sending logic would go here if you integrate a service like Twilio.
  console.log("\n----- Nội dung SMS (chưa gửi đi) ------\n");
  console.log(result.confirmationSms);
  console.log("\n--------------------------------------------\n");

  return result;
}

const prompt = ai.definePrompt({
  name: 'orderConfirmationPrompt',
  input: { schema: OrderInputSchema },
  output: { schema: OrderOutputSchema },
  prompt: `
You are an order processing agent for a Vietnamese 3D printing service named "in3D". Your tone must be professional, friendly, and reassuring. All responses must be in Vietnamese.

A customer has just submitted an order. Your task is to generate a confirmation email and a short SMS message. The email should be formatted in Markdown.

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

TASK 1: GENERATE CONFIRMATION EMAIL (Markdown format)
- Subject: Xác nhận đơn hàng in 3D từ in3D
- Start with a warm greeting (e.g., "Chào anh/chị {{{customerName}}},").
- Thank them for their order with in3D.
- Confirm that the order has been received and is being processed.
- Provide a summary of the order details in a clear, easy-to-read format. Use Markdown lists.
- Mention the total cost.
- Inform them that you will contact them shortly at their phone number ({{{customerPhone}}}) to confirm the order details and discuss payment and delivery.
- End with a professional closing (e.g., "Trân trọng," followed by "Đội ngũ in3D").

TASK 2: GENERATE CONFIRMATION SMS
- The SMS should be a short, concise message.
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
