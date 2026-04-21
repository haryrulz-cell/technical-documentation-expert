import Anthropic from "@anthropic-ai/sdk";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat,
} from "docx";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a Senior Microsoft Dynamics 365 Technical Architect and Functional Consultant with 15+ years of experience across D365 Finance & Operations, D365 CE (CRM), Power Platform, and Azure integrations.

DOCUMENT OUTPUT RULE — CRITICAL:
When the user requests any formal document or deliverable (HLD, LLD, TDD, BRD, SDD, PRD, API Spec, Test Plan, Test Cases, Test Summary, User Stories, Product Backlog, Sprint Backlog, Project Charter, Feasibility Report, Release Notes, Deployment Guide, User Manual, Support Model, Definition of Done, Release Plan, or any consulting document), you MUST wrap your response in these exact XML tags:

<DOC_TYPE>HLD</DOC_TYPE>
<DOC_TITLE>Document Title Here</DOC_TITLE>
<DOC_CONTENT>
[Full document in markdown — use ## for sections, ### for subsections, **bold**, - for bullets, numbered lists, and | pipe tables]
</DOC_CONTENT>

For plain conversational questions (not document requests), respond normally without XML tags.

Your documents must be Big 4 / Tier 1 SI consulting quality:
- Include: Version History table, Executive Summary, numbered sections, Assumptions, Risks & Dependencies
- Use real D365 module names, data entities (e.g. SalesOrderHeadersV2Entity), table names, menu paths
- Include D365-specific: modules, integration approach, environments (Dev/UAT/Prod), security roles, ALM strategy
- Be precise, detailed, and client-presentation ready`;

function parseDocResponse(text) {
  const typeMatch = text.match(/<DOC_TYPE>(.*?)<\/DOC_TYPE>/s);
  const titleMatch = text.match(/<DOC_TITLE>(.*?)<\/DOC_TITLE>/s);
  const contentMatch = text.match(/<DOC_CONTENT>([\s\S]*?)<\/DOC_CONTENT>/s);
  if (!typeMatch || !contentMatch) return null;
  return {
    docType: typeMatch[1].trim(),
    docTitle: titleMatch ? titleMatch[1].trim() : "D365 Technical Document",
    docContent: contentMatch[1].trim(),
  };
}

function stripDocTags(text) {
  return text
    .replace(/<DOC_TYPE>[\s\S]*?<\/DOC_TYPE>/g, "")
    .replace(/<DOC_TITLE>[\s\S]*?<\/DOC_TITLE>/g, "")
    .replace(/<DOC_CONTENT>/g, "")
    .replace(/<\/DOC_CONTENT>/g, "")
    .trim();
}

async function generateDocx(docTitle, docType, docContent, userName) {
  const NAVY = "1F3864", BLUE = "2E5FA3", WHITE = "FFFFFF";
  const DGRAY = "333333", MGRAY = "666666", BGRAY = "CCCCCC", ALTROW = "EEF4FB";

  const tb = (c = BGRAY) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
  const ab = (c = BGRAY) => ({ top: tb(c), bottom: tb(c), left: tb(c), right: tb(c) });
  const cm = { top: 80, bottom: 80, left: 120, right: 120 };

  const hCell = (text, w) => new TableCell({
    borders: ab(BLUE), width: { size: w, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cm,
    children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text, font: "Arial", size: 20, bold: true, color: WHITE })] })]
  });
  const dCell = (text, w, shade = false, bold = false, color = DGRAY) => new TableCell({
    borders: ab(), width: { size: w, type: WidthType.DXA },
    shading: { fill: shade ? ALTROW : WHITE, type: ShadingType.CLEAR }, margins: cm,
    children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: String(text || ""), font: "Arial", size: 20, bold, color })] })]
  });
  const spacer = (pts = 120) => new Paragraph({ spacing: { after: pts }, children: [] });
  const divider = () => new Paragraph({ spacing: { before: 80, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } }, children: [] });

  function parseInline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
    return parts.filter(Boolean).map(part => {
      if (part.startsWith("**") && part.endsWith("**")) return new TextRun({ text: part.slice(2, -2), font: "Arial", size: 22, bold: true, color: DGRAY });
      if (part.startsWith("*") && part.endsWith("*")) return new TextRun({ text: part.slice(1, -1), font: "Arial", size: 22, italics: true, color: DGRAY });
      if (part.startsWith("`") && part.endsWith("`")) return new TextRun({ text: part.slice(1, -1), font: "Courier New", size: 20, color: "185FA5" });
      return new TextRun({ text: part, font: "Arial", size: 22, color: DGRAY });
    });
  }

  function parseMarkdownToDocx(md) {
    const elements = [];
    const lines = md.split("\n");
    let inTable = false, tableRows = [];

    const flushTable = () => {
      if (tableRows.length < 2) { tableRows = []; inTable = false; return; }
      const headers = tableRows[0].split("|").map(c => c.trim()).filter(Boolean);
      const dataRows = tableRows.slice(2).filter(r => !/^[\s|:-]+$/.test(r));
      if (!headers.length) { tableRows = []; inTable = false; return; }
      const colW = Math.floor(9360 / headers.length);
      elements.push(new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: headers.map(() => colW),
        rows: [
          new TableRow({ children: headers.map((h, i) => hCell(h, colW)) }),
          ...dataRows.map((row, ri) => {
            const cells = row.split("|").map(c => c.trim()).filter(Boolean);
            return new TableRow({ children: headers.map((_, i) => dCell(cells[i] || "", colW, ri % 2 === 1)) });
          })
        ]
      }));
      elements.push(spacer(120));
      tableRows = []; inTable = false;
    };

    for (const line of lines) {
      if (line.trim().startsWith("|")) { inTable = true; tableRows.push(line); continue; }
      if (inTable) flushTable();
      if (!line.trim()) { elements.push(spacer(80)); continue; }
      if (/^# /.test(line)) {
        elements.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: line.replace(/^# /, ""), font: "Arial", size: 30, bold: true, color: NAVY })] }));
      } else if (/^## /.test(line)) {
        elements.push(divider());
        elements.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, children: [new TextRun({ text: line.replace(/^## /, ""), font: "Arial", size: 26, bold: true, color: BLUE })] }));
      } else if (/^### /.test(line)) {
        elements.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 80 }, children: [new TextRun({ text: line.replace(/^### /, ""), font: "Arial", size: 24, bold: true, color: DGRAY })] }));
      } else if (/^[-*] /.test(line)) {
        elements.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: parseInline(line.replace(/^[-*] /, "")) }));
      } else if (/^\d+\. /.test(line)) {
        elements.push(new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: parseInline(line.replace(/^\d+\. /, "")) }));
      } else {
        elements.push(new Paragraph({ spacing: { after: 100 }, children: parseInline(line) }));
      }
    }
    if (inTable) flushTable();
    return elements;
  }

  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const bodyElements = parseMarkdownToDocx(docContent);

  const doc = new Document({
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ]
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 30, bold: true, font: "Arial", color: NAVY }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: BLUE }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial", color: DGRAY }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
      ]
    },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: [
          spacer(1400),
          new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
            rows: [new TableRow({ children: [new TableCell({
              borders: ab(NAVY), shading: { fill: NAVY, type: ShadingType.CLEAR },
              margins: { top: 560, bottom: 560, left: 700, right: 700 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: docType.toUpperCase(), font: "Arial", size: 22, bold: true, color: "A9C4E8", characterSpacing: 100 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: docTitle, font: "Arial", size: 34, bold: true, color: WHITE })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: "Technical Documentation Expert  |  Powered by Claude AI", font: "Arial", size: 18, color: "A9C4E8", italics: true })] }),
              ]
            })] })]
          }),
          spacer(500),
          new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [2800, 6560],
            rows: [
              new TableRow({ children: [new TableCell({ columnSpan: 2, borders: ab(BLUE), shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cm, width: { size: 9360, type: WidthType.DXA }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Document Details", font: "Arial", size: 20, bold: true, color: WHITE })] })] })] }),
              ...[ ["Document Type", docType], ["Version", "1.0 — DRAFT"], ["Date", date], ["Prepared By", userName || "Technical Documentation Expert"], ["Reviewed By", "[Client Solution Architect — TBC]"], ["Classification", "CONFIDENTIAL"] ]
                .map(([k, v], i) => new TableRow({ children: [dCell(k, 2800, i % 2 === 1, true), dCell(v, 6560, i % 2 === 1, false, i === 5 ? "C00000" : DGRAY)] }))
            ]
          }),
        ]
      },
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
        headers: {
          default: new Header({ children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: `${docTitle}  `, font: "Arial", size: 18, bold: true, color: BLUE }),
              new TextRun({ text: `| ${docType} v1.0  |  ${date}  |  CONFIDENTIAL`, font: "Arial", size: 16, color: MGRAY }),
            ]
          })] })
        },
        footers: {
          default: new Footer({ children: [new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: BGRAY, space: 2 } },
            spacing: { before: 80 },
            children: [
              new TextRun({ text: "Page ", font: "Arial", size: 18, color: MGRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: MGRAY }),
              new TextRun({ text: " of ", font: "Arial", size: 18, color: MGRAY }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: MGRAY }),
              new TextRun({ text: `     |     ${docTitle}     |     Technical Documentation Expert`, font: "Arial", size: 16, color: MGRAY }),
            ]
          })] })
        },
        children: bodyElements,
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request) {
  try {
    const { messages, userName } = await request.json();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages,
    });

    const rawText = response.content?.find(b => b.type === "text")?.text || "";
    const parsed = parseDocResponse(rawText);

    if (parsed) {
      const { docType, docTitle, docContent } = parsed;
      const docxBase64 = await generateDocx(docTitle, docType, docContent, userName || "");
      const safeFilename = docTitle.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").slice(0, 60) + "_v1.0.docx";
      return Response.json({
        content: [{ type: "text", text: stripDocTags(rawText) }],
        document: { base64: docxBase64, filename: safeFilename, docType, docTitle }
      });
    }

    return Response.json({ content: response.content });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
