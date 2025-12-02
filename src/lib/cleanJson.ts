
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

  // 3. Handle cases where the initial brace might be missing
  if (!jsonString.startsWith('{') && jsonString.includes(':')) {
    const firstColon = jsonString.indexOf(':');
    const braceBeforeColon = jsonString.lastIndexOf('{', firstColon);
    if (braceBeforeColon === -1) {
      jsonString = '{' + jsonString;
      // Attempt to add a closing brace if it seems to be missing
      if (jsonString.lastIndexOf('}') < jsonString.length - 2) {
          jsonString += '}';
      }
    }
  }


  try {
    // 4. Parse the cleaned string
    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error("Failed to parse LLM JSON after cleaning:", error.message);
    console.error("Original AI Output that failed parsing:", llmOutput);
    console.error("String that was attempted to be parsed:", jsonString);
    throw new Error("AI returned an invalid or malformed JSON structure that could not be automatically corrected.");
  }
}
