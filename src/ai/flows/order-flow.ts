'use server';
/**
 * @fileOverview A flow to process customer orders and save them to Firestore.
 * 
 * - processOrder - A function that handles the order submission.
 */
import { ai } from '@/ai/genkit';
import { OrderInputSchema, type OrderInput } from '../schema';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


// This function now only saves the order to Firestore.
// The AI generation part has been removed to simplify the process.
export async function processOrder(input: OrderInput): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const docRef = await addDoc(collection(db, "orders"), {
      ...input,
      createdAt: serverTimestamp(),
    });
    console.log(`Order successfully saved to Firestore with ID: ${docRef.id}.`);
    
    // The fire-and-forget AI call has been removed.

    return { success: true, orderId: docRef.id };
  } catch (error: any) {
    console.error("Error saving order to Firestore:", error);
    return { success: false, error: error.message };
  }
}
