
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

// --- 1. Define the Schema using Zod ---
const transactionSchema = z.object({
  transactions: z.array(
    z.object({
      transaction_date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
      transaction_time: z.string().nullable().describe("The time of the transaction (HH:MM:SS) if available, else null."),
      description: z.string().describe("The merchant name or description of the transaction."),
      amount: z.number().describe("The numeric amount of the transaction."),
      currency: z.string().describe("The currency symbol or code (e.g., USD, INR)."),
      transaction_type: z.enum(["Credit", "Debit"]).describe("Type of transaction."),
    })
  ),
});

// --- 2. Setup the Zoho QuickML Model ---
// Note: Replace the API Key and Base URL with your actual Zoho QuickML Endpoint details
const model = new ChatOpenAI({
  modelName: "qwen2.5-coder", // or the specific model name defined in your Zoho endpoint
  temperature: 0,
  configuration: {
    baseURL: process.env.ZOHO_QUICKML_ENDPOINT_URL, // e.g. https://<your-zoho-endpoint>/v1
    defaultHeaders: {
      "X-QUICKML-ENDPOINT-KEY": process.env.ZOHO_ENDPOINT_KEY || "",
      "Authorization": `Zoho-oauthtoken ${process.env.ZOHO_OAUTH_TOKEN || ""}`
    }
  },
  apiKey: "dummy-key", // The SDK requires a key, but Zoho uses the custom headers above
});

// --- 3. Create the Extraction Chain ---
export async function extractTransactions(pageContent: string) {
  const parser = StructuredOutputParser.fromZodSchema(transactionSchema);

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an expert data extraction algorithm. You specialize in parsing financial documents."],
    ["human", `Extract all transaction details from the following document text.
    
    Focus specifically on:
    1. Date of transaction
    2. Time of transaction (if strictly visible)
    3. Description/Narration
    4. Amount
    
    Format Instructions:
    {format_instructions}
    
    Document Text:
    {text}`],
  ]);

  // Connect the chain: Prompt -> Model -> Parser
  const chain = prompt.pipe(model).pipe(parser);

  try {
    const result = await chain.invoke({
      text: pageContent,
      format_instructions: parser.getFormatInstructions(),
    });

    // Remap from langchain schema to app schema
    return result.transactions.map(t => ({
        date: t.transaction_date,
        time: t.transaction_time || undefined,
        description: t.description,
        amount: t.amount,
        type: t.transaction_type === 'Credit' ? 'income' : 'expense',
    }));

  } catch (error) {
    console.error("Error extracting from page:", error);
    return [];
  }
}
