const PDFParser = require('pdf2json');

async function extract() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const pdfParser = new PDFParser(null, 1);

  pdfParser.on('pdfParser_dataError', errData => {
    console.error(errData.parserError);
    process.exit(1);
  });
  
  pdfParser.on('pdfParser_dataReady', () => {
    const text = pdfParser.getRawTextContent();
    const estimatedPages = Math.max(1, Math.round(text.split(/\s+/).length / 400));
    console.log("===RESULT_START===");
    console.log(JSON.stringify({ text, pageCount: estimatedPages }));
    console.log("===RESULT_END===");
    process.exit(0);
  });

  try {
    pdfParser.parseBuffer(buffer);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

extract();
