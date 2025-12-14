# WealthIn AI Functionality Documentation

This document provides a technical overview of the Generative AI architecture and functionality within the WealthIn application. It is intended for developers to understand how AI features are implemented, from data structuring to prompt engineering.

## 1. High-Level Architecture

The application's AI capabilities are powered by a backend service, which is accessed through a dedicated service layer within the Next.js application.

1.  **Client-Side Component**: A user interacts with a feature in the UI (e.g., clicks "Import Transactions").
2.  **Next.js Server Action**: The component calls a Server Action (`src/app/actions.ts`). This action acts as a secure bridge between the client and the server-side AI logic.
3.  **AI Flow**: The Server Action invokes a specific "AI flow" (`src/ai/flows/*.ts`). Each flow is a dedicated function responsible for orchestrating a single, complex AI task.
4.  **Catalyst Service**: The AI flow calls the Catalyst Service (`src/services/catalyst.ts`), which is a wrapper that handles authentication and communication with the underlying AI model endpoint (in this case, Zoho Catalyst's LLM service). It abstracts away the complexity of managing API tokens and making raw HTTP requests.
5.  **AI Model**: The AI model processes the request and returns a response, which flows back through the same chain to the user interface.

## 2. AI Schemas (The "What")

Before any AI operation, we must define the shape of the data we expect to send and receive. This is handled using **Zod schemas**.

-   **Location**: `src/ai/schemas/*.ts`
-   **Technology**: [Zod](https://zod.dev/) is a TypeScript-first schema declaration and validation library.

### Why Zod?

1.  **Type Safety**: Zod schemas generate TypeScript types automatically. This means we have compile-time checks that our data structures are correct throughout the application.
2.  **Runtime Validation**: We can use the schema to parse and validate the AI's response at runtime. If the AI returns data that doesn't match our expected format, Zod throws a detailed error, which we can catch and handle gracefully.
3.  **Single Source of Truth**: The Zod schema is the single source of truth for a data structure. We define it once and use it for both types and validation.

### Example: `ExtractedTransactionSchema`

File: `src/ai/schemas/transactions.ts`

```typescript
export const ExtractedTransactionSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  date: z.string().describe('The date... normalized to YYYY-MM-DD format.'),
  time: z.string().optional().describe('The time...'),
  type: z.enum(['income', 'expense']).describe('The type of transaction...'),
  amount: z.coerce.number().describe("The transaction amount as a number."),
});
```

-   `z.object({...})` defines the shape of a transaction object.
-   `z.string()`, `z.number()`, etc., define the expected data type for each field.
-   `.optional()` marks a field as not required (e.g., `time`).
-   `.describe(...)` adds a description that can be used for documentation or even included in AI prompts to guide the model.
-   `z.coerce.number()` tells Zod to attempt to convert a value (like a string `"100"`) into a number.

## 3. AI Flows & Prompts (The "How")

An **AI Flow** is a server-side function that orchestrates a specific AI task. It prepares the data, constructs the prompts, calls the AI service, and processes the response.

-   **Location**: `src/ai/flows/*.ts`

A **Prompt** is the set of instructions given to the AI model. In this application, a prompt typically consists of two parts:

1.  **System Prompt**: Defines the AI's persona, role, and high-level instructions. It sets the context for the entire conversation. For example: *"You are an expert financial analyst. Your response MUST be ONLY a valid JSON array..."*
2.  **User Prompt**: Contains the specific task, user-provided data, and any formatting instructions. It often uses template literals to inject dynamic data (like transaction lists or user input).

### Example: `extractTransactionsFromDocument.ts`

This flow manages the process of extracting transactions from a document.

1.  **Input**: Takes a data URI of a document (`documentDataUri`) and its `mimeType`.
2.  **Text Extraction (Stage 1)**:
    -   It first determines if the document is an image or a PDF.
    -   It calls a specific helper function (`extractTextWithVision` for images, `extractTextFromPdf` for PDFs) to get the raw text content from each page. This is done page-by-page to handle large documents without exceeding token limits.
3.  **Structuring with AI (Stage 2)**:
    -   It loops through the text of each page.
    -   For each page's text, it calls `structureTextWithLLM`. This function constructs the system and user prompts.
    -   The user prompt includes the Zod schema definition for a transaction, instructing the AI to return a JSON array matching that exact structure.
    -   It calls the `generateText` function from the Catalyst service.
4.  **Parsing & Cleaning**: The raw text response from the AI is passed to `cleanAndParseJSON`, which sanitizes the string and parses it into a JavaScript array.
5.  **Deduplication (Stage 3)**: All transactions from all pages are collected, and a `removeDuplicates` function filters out any identical entries based on date, time, description, and amount.
6.  **Output**: The final, validated list of unique transactions is returned, conforming to the `ExtractTransactionsOutputSchema`.

This multi-stage process (Extract -> Structure -> Deduplicate) makes the feature robust and reliable.

## 4. Key AI-Powered Features

-   **Dashboard Summary (`generate-dashboard-summary.ts`)**:
    -   **Input**: A list of recent transactions.
    -   **Process**: Calculates total income and expenses server-side. Sends a summary of the data to the AI.
    -   **Prompt**: Asks for a single, actionable "Fin Bite" (financial tip) based on the user's activity.
    -   **Output**: A JSON object containing calculated totals and the AI-generated suggestion.

-   **AI Advisor (`generate-rag-answer.ts`)**:
    -   **Input**: User's question, recent transactions, user profile, and public MSME marketplace data.
    -   **Process**: This is a Retrieval-Augmented Generation (RAG) flow. It bundles all contextual data into a comprehensive prompt.
    -   **Prompt**: Instructs the AI to act as a friendly financial advisor, use the provided context to give a personalized answer, and recommend vendors from the marketplace if relevant.
    -   **Output**: A conversational, markdown-formatted text answer.

-   **Business Idea Analysis (`generate-idea-section.ts`)**:
    -   **Input**: A business idea (string) and the specific section to generate (e.g., "Investment Strategy").
    -   **Process**: This flow generates one section of the analysis at a time to provide a streaming-like experience in the UI. It also receives MSME marketplace data to look for potential suppliers.
    -   **Prompt**: Each section has a unique, detailed prompt instructing the AI on what to cover, what format to use (HTML), and how to incorporate context (like marketplace data).
    -   **Output**: An HTML string containing the content for a single analysis section.

-   **Detailed Project Report (DPR) Generation (`generate-dpr-section.ts`)**:
    -   **Input**: A rich data object containing all the details about the business idea, collected from the user.
    -   **Process**: Similar to idea analysis, it generates the DPR section by section. The `financialProjections` section is unique; it uses multiple parallel AI calls to generate different pieces of financial data and then assembles them into a single JSON object.
    -   **Prompt**: The prompts are highly specialized, asking for content tailored to a bank-ready DPR. The financial prompt explicitly asks for a JSON object conforming to a Zod schema.
    -   **Output**: HTML strings for most sections, and a complex JSON object for the financial section.
