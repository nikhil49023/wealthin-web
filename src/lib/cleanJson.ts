
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
    const firstBrace = jsonString.indexOf('{');
    const firstBracket = jsonString.indexOf('[');
    
    let firstIndex = -1;
    if (firstBrace > -1 && firstBracket > -1) {
        firstIndex = Math.min(firstBrace, firstBracket);
    } else {
        firstIndex = Math.max(firstBrace, firstBracket);
    }

    const lastBrace = jsonString.lastIndexOf('}');
    const lastBracket = jsonString.lastIndexOf(']');
    
    let lastIndex = Math.max(lastBrace, lastBracket);

    if (firstIndex !== -1 && lastIndex !== -1 && lastIndex > firstIndex) {
      jsonString = jsonString.substring(firstIndex, lastIndex + 1);
    }
  }

  try {
    // 3. Parse the cleaned string
    let parsed = JSON.parse(jsonString);

    // 4. If the result is an object with a 'transactions' key, extract the array
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 'transactions' in parsed && Array.isArray(parsed.transactions)) {
        parsed = parsed.transactions;
    }
    
    // Ensure the final output is an array
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
