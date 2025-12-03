
export function cleanAndParseJSON(llmOutput: string) {
  if (typeof llmOutput !== 'string') {
    console.error("cleanAndParseJSON received a non-string input:", llmOutput);
    throw new Error("Invalid input to JSON parser.");
  }
  
  let jsonString = llmOutput.trim();

  // 1. Try to find a JSON block within markdown ```json ... ```
  const markdownMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
  if (markdownMatch && markdownMatch[1]) {
    jsonString = markdownMatch[1];
  } else {
    // 2. If no markdown, aggressively find the main JSON object/array
    // This is more robust for cases where there's leading/trailing text.
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    } else {
      // Fallback for objects, though we now expect an array
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      }
    }
  }

  try {
    // 3. Parse the cleaned string
    let parsed = JSON.parse(jsonString);

    // 4. If the result is an object with a 'transactions' key, extract the array
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 'transactions' in parsed && Array.isArray(parsed.transactions)) {
        parsed = parsed.transactions;
    }
    
    // 5. Ensure the final output is an array. If not, something is wrong.
    if (!Array.isArray(parsed)) {
       throw new Error("Final parsed content is not a JSON array.");
    }

    return parsed;
  } catch (error: any) {
    console.error("Failed to parse LLM JSON after cleaning:", error.message);
    console.error("Original AI Output that failed parsing:", llmOutput);
    console.error("String that was attempted to be parsed:", jsonString);
    throw new Error("AI returned an invalid or malformed JSON structure that could not be automatically corrected.");
  }
}
