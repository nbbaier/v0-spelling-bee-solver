"use server";

import { createFeedback, type FeedbackResult } from "@/lib/feedback";

export async function submitFeedback(
  formData: FormData
): Promise<FeedbackResult> {
  return await createFeedback(
    formData.get("title"),
    formData.get("description")
  );
}
