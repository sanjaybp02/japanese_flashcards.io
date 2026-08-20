import os
import re
import subprocess
import tempfile
import markdown

# Paths
MD_PATH = r"C:\Users\Sanjay\.gemini\antigravity\brain\47e70075-75de-4e97-8ac9-b7d06c186d8f\learnings_and_concepts.md"
HTML_OUTPUT_PATH = r"C:\Users\Sanjay\.gemini\antigravity\brain\47e70075-75de-4e97-8ac9-b7d06c186d8f\learnings_and_concepts.html"
PDF_ARTIFACT_PATH = r"C:\Users\Sanjay\.gemini\antigravity\brain\47e70075-75de-4e97-8ac9-b7d06c186d8f\learnings_and_concepts.pdf"
PDF_WORKSPACE_PATH = r"F:\Codex\Japanese flash cards\learnings_and_concepts.pdf"

# Read Markdown content
with open(MD_PATH, "r", encoding="utf-8") as f:
    md_content = f.read()

# Convert Markdown to HTML
html_body = markdown.markdown(
    md_content,
    extensions=["fenced_code", "tables", "toc", "attr_list"]
)

# Custom Code Block Syntax Formatting (Enhance code block appearance in HTML)
def process_code_blocks(html):
    def replace_code(match):
        code = match.group(1)
        # Escape HTML inside code
        code = code.replace("<", "&lt;").replace(">", "&gt;")
        return f'<pre class="code-block"><code>{code}</code></pre>'
    return re.sub(r'<p><code>(.*?)</code></p>', replace_code, html, flags=re.DOTALL)

html_body = process_code_blocks(html_body)

# Wrap in a full HTML document with print-optimized CSS
full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Japanese Flashcards — Master Beginner's Guide</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page {{
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
    }}
    
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10.5pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      padding: 0;
    }}

    /* Header Banner */
    .header-banner {{
      border-bottom: 3px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }}
    
    h1 {{
      font-size: 22pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
      line-height: 1.25;
    }}

    h2 {{
      font-size: 14pt;
      font-weight: 700;
      color: #0369a1;
      margin-top: 22px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      page-break-after: avoid;
    }}

    h3 {{
      font-size: 11.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }}

    h4 {{
      font-size: 10.5pt;
      font-weight: 600;
      color: #334155;
      margin-top: 12px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }}

    p {{
      margin-bottom: 10px;
      color: #334155;
    }}

    ul, ol {{
      margin-bottom: 12px;
      padding-left: 20px;
    }}

    li {{
      margin-bottom: 4px;
      color: #334155;
    }}

    strong {{
      color: #0f172a;
      font-weight: 600;
    }}

    code {{
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #0284c7;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }}

    pre, .code-block {{
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 14px;
      border-radius: 8px;
      margin: 12px 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      page-break-inside: avoid;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
    }}

    pre code {{
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: inherit;
    }}

    /* Table Formatting */
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }}

    th {{
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #0f172a;
    }}

    td {{
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      color: #334155;
      vertical-align: top;
    }}

    tr:nth-child(even) td {{
      background: #f8fafc;
    }}

    /* Blockquote / Alert callout */
    blockquote {{
      border-left: 4px solid #0284c7;
      background: #f0f9ff;
      padding: 10px 14px;
      margin: 12px 0;
      border-radius: 0 6px 6px 0;
      color: #0369a1;
      font-size: 10pt;
    }}

    hr {{
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }}
  </style>
</head>
<body>
  <div class="header-banner">
    <p style="font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: #0284c7; margin-bottom: 2px;">Technical Documentation & Architecture Manual</p>
  </div>
  {html_body}
</body>
</html>
"""

# Save rendered HTML file
with open(HTML_OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write(full_html)

print(f"Generated HTML at {HTML_OUTPUT_PATH}")

# Convert HTML to PDF using Microsoft Edge headless
edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_exe):
    edge_exe = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

temp_user_data = os.path.join(tempfile.gettempdir(), "edge_pdf_export_temp")

cmd = [
    edge_exe,
    "--headless",
    "--disable-gpu",
    f"--user-data-dir={temp_user_data}",
    f"--print-to-pdf={PDF_ARTIFACT_PATH}",
    HTML_OUTPUT_PATH
]

print(f"Running command: {' '.join(cmd)}")
res = subprocess.run(cmd, capture_output=True, text=True)

if os.path.exists(PDF_ARTIFACT_PATH):
    print(f"Successfully created artifact PDF: {PDF_ARTIFACT_PATH}")
    # Copy to workspace root for convenient user access
    import shutil
    shutil.copyfile(PDF_ARTIFACT_PATH, PDF_WORKSPACE_PATH)
    print(f"Successfully copied PDF to workspace root: {PDF_WORKSPACE_PATH}")
else:
    print(f"PDF generation failed: {res.stderr}")
