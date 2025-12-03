
export function cleanAndParseJSON(llmOutput: string) {
  if (typeof llmOutput !== 'string') {
    console.error("cleanAndParseJSON received a non-string input:", llmOutput);
    return []; // Return empty array for invalid input
  }
  
  let jsonString = llmOutput.trim();

  // 1. Try to find a JSON block within markdown ```json ... ```
  const markdownMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
  if (markdownMatch && markdownMatch[1]) {
    jsonString = markdownMatch[1];
  } else {
    // 2. If no markdown, aggressively find the main JSON object/array
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    let startIndex = -1;
    let endIndex = -1;

    if (firstBracket !== -1 && lastBracket > firstBracket) {
      startIndex = firstBracket;
      endIndex = lastBracket;
    } else if (firstBrace !== -1 && lastBrace > firstBrace) {
      startIndex = firstBrace;
      endIndex = lastBrace;
    }
    
    if (startIndex !== -1 && endIndex !== -1) {
      jsonString = jsonString.substring(startIndex, endIndex + 1);
    }
  }

  try {
    // 3. Parse the cleaned string
    let parsed = JSON.parse(jsonString);

    // 4. If the result is an object with a 'transactions' key, extract the array
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 'transactions' in parsed && Array.isArray(parsed.transactions)) {
        parsed = parsed.transactions;
    }
    
    return parsed; // Return whatever was parsed

  } catch (error: any) {
    console.error("Failed to parse LLM JSON after aggressive cleaning:", error.message);
    console.error("Original AI Output that failed parsing:", llmOutput);
    console.error("String that was attempted to be parsed:", jsonString);
    // Return an empty array or a specific error indicator if parsing fails
    return [];
  }
}
