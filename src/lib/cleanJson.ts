
export function cleanAndParseJSON(llmOutput: string) {
  if (typeof llmOutput !== 'string') {
    console.error("cleanAndParseJSON received a non-string input:", llmOutput);
    throw new Error("Invalid input to JSON parser.");
  }
  
  try {
    // Attempt to parse directly first, in case the output is already perfect JSON
    return JSON.parse(llmOutput);
  } catch (e) {
    // If direct parsing fails, proceed with cleaning
    try {
      // 1. Find the first '{' and the last '}' to isolate the JSON object
      // This is a more robust way to strip leading/trailing text than regex.
      const firstBrace = llmOutput.indexOf("{");
      const lastBrace = llmOutput.lastIndexOf("}");

      if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        throw new Error("No valid JSON object found in the AI response.");
      }

      const jsonString = llmOutput.substring(firstBrace, lastBrace + 1);

      // 2. Parse the cleaned string
      return JSON.parse(jsonString);

    } catch (error: any) {
      console.error("Failed to parse LLM JSON after cleaning:", error.message);
      console.error("Original AI Output:", llmOutput);
      throw new Error("AI returned an invalid or malformed JSON structure.");
    }
  }
}
