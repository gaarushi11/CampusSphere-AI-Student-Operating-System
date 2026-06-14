const fs = require('fs');

async function testPdfParse() {
  try {
    const PDFParserModule = await import('pdf2json');
    const PDFParser = PDFParserModule.default || PDFParserModule;
    
    // A tiny valid PDF buffer
    const buffer = Buffer.from('%PDF-1.4\n%EOF\n');
    
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on('pdfParser_dataError', (err) => console.log('Error correctly caught:', err.parserError.message));
    pdfParser.on('pdfParser_dataReady', () => console.log('Ready:', pdfParser.getRawTextContent()));
    pdfParser.parseBuffer(buffer);
  } catch (err) {
    console.error("Failed:", err);
  }
}

testPdfParse();
