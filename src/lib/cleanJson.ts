
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
    // 2. If no markdown, find the first '{' or '[' and last '}' or ']'
    const firstBrace = jsonString.indexOf('{');
    const firstBracket = jsonString.indexOf('[');
    
    let firstIndex = -1;
    if (firstBrace > -1 && firstBracket > -1) {
        firstIndex = Math.min(firstBrace, firstBracket);
    } else if (firstBrace > -1) {
        firstIndex = firstBrace;
    } else {
        firstIndex = firstBracket;
    }

    const lastBrace = jsonString.lastIndexOf('}');
    const lastBracket = jsonString.lastIndexOf(']');
    
    let lastIndex = -1;
    if (lastBrace > -1 && lastBracket > -1) {
        lastIndex = Math.max(lastBrace, lastBracket);
    } else if (lastBrace > -1) {
        lastIndex = lastBrace;
    } else {
        lastIndex = lastBracket;
    }


    if (firstIndex !== -1 && lastIndex !== -1 && lastIndex > firstIndex) {
      jsonString = jsonString.substring(firstIndex, lastIndex + 1);
    }
  }

  // If the string does not start with a brace, prepend one.
  // This handles cases where the model forgets the opening brace.
  if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
      const braceIndex = jsonString.indexOf('{');
      if (braceIndex > 0) {
          jsonString = jsonString.substring(braceIndex);
      } else {
         jsonString = '{' + jsonString;
      }
  }

  try {
    // 3. Parse the cleaned string
    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error("Failed to parse LLM JSON after cleaning:", error.message);
    console.error("Original AI Output that failed parsing:", llmOutput);
    throw new Error("AI returned an invalid or malformed JSON structure.");
  }
}
