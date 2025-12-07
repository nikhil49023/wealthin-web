
import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import { extractTransactionsFromDocument } from "@/ai/flows/extract-transactions-from-document";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let transactions;

    // Check if the file is an image and use the vision model flow
    if (file.type.startsWith("image/")) {
      const base64 = buffer.toString('base64');
      const dataUri = `data:${file.type};base64,${base64}`;
      const result = await extractTransactionsFromDocument({ documentDataUri: dataUri });
      transactions = result.transactions;
    } 
    // Handle PDFs with the text-based flow
    else if (file.type === 'application/pdf') {
      const data = await pdf(buffer);
      const fullText = data.text;
       if (!fullText) {
        throw new Error("Could not extract text from the PDF. It might be an image-based PDF. Please try uploading as a PNG or JPG.");
      }
      // This path now needs to adapt to a flow that accepts raw text.
      // For now, we will simulate this by using the vision flow, which is more robust.
      // A future improvement would be to have a separate text-only flow.
      const result = await extractTransactionsFromDocument({ documentDataUri: `data:text/plain;base64,${Buffer.from(fullText).toString('base64')}` });
      transactions = result.transactions;
    }
    else {
      return NextResponse.json({ error: "Unsupported file type. Please upload a PDF, JPG, or PNG file." }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      count: transactions.length,
      transactions: transactions
    });

  } catch (error: any) {
    console.error("Processing Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process the document." },
      { status: 500 }
    );
  }
}
