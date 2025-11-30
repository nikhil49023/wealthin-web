
export function cleanAndParseJSON(llmOutput: string) {
  try {
    // 1. Remove Markdown code blocks (```json ... ```)
    let cleanText = llmOutput.replace(/```json/g, "").replace(/```/g, "");

    // 2. Find the first '{' and the last '}' to isolate the JSON object
    // This ignores any conversational text before or after the JSON
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object found in response");
    }

    cleanText = cleanText.substring(firstBrace, lastBrace + 1);

    // 3. Parse the cleaned string
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Failed to parse LLM JSON:", error);
    console.error("Original Output:", llmOutput); // Log this to debug!
    throw new Error("AI returned invalid JSON structure");
  }
}
