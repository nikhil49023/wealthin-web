
import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import { extractTransactions } from "@/lib/extractionService";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert File to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF
    const data = await pdf(buffer);
    const fullText = data.text;

    // NOTE: For very large PDFs, you might want to split 'fullText' by pages 
    // or chunks here to avoid hitting the context window limit.
    // Since pdf-parse returns all text, we send it as one block for this example.
    
    console.log("--- Extracted Text length:", fullText.length);

    // Run the extraction flow
    const transactions = await extractTransactions(fullText);

    return NextResponse.json({ 
      success: true, 
      count: transactions.length,
      transactions: transactions // The key should be 'transactions' to match the output schema
    });

  } catch (error: any) {
    console.error("Processing Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process PDF" },
      { status: 500 }
    );
  }
}
