import { NextRequest, NextResponse } from "next/server"; // To handle the request and response
import { promises as fs } from "fs"; // To save the file temporarily
import { v4 as uuidv4 } from "uuid"; // To generate a unique filename
import PDFParser from "pdf2json"; // To parse the pdf

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Generate a unique filename
    const fileName = uuidv4();
    const tempFilePath = `/tmp/${fileName}.pdf`;

    // Convert ArrayBuffer to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Save the buffer as a file
    await fs.writeFile(tempFilePath, fileBuffer);

    // Parse the PDF
    const pdfParser = new (PDFParser as any)(null, 1);
    let parsedText = "";

    // Create a promise to handle the async PDF parsing
    const parsePromise = new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error("PDF parsing error:", errData.parserError);
        reject(new Error("Failed to parse PDF"));
      });

      pdfParser.on("pdfParser_dataReady", () => {
        try {
          parsedText = (pdfParser as any).getRawTextContent();
          console.log("PDF parsed successfully");
          console.log("Extracted text length:", parsedText.length);
          console.log("First 500 characters:", parsedText.substring(0, 500));
          resolve(parsedText);
        } catch (error) {
          console.error("Error getting text content:", error);
          reject(error);
        }
      });

      pdfParser.loadPDF(tempFilePath);
    });

    // Wait for the PDF parsing to complete
    await parsePromise;

    // Clean up the temporary file
    await fs.unlink(tempFilePath);

    return NextResponse.json({ text: parsedText });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
