import os
import re
import subprocess
import tempfile
import markdown
import shutil

MD_PATH = r"C:\Users\Sanjay\.gemini\antigravity\brain\47e70075-75de-4e97-8ac9-b7d06c186d8f\git_workflow_for_vibe_coders.md"
HTML_OUTPUT_PATH = r"C:\Users\Sanjay\.gemini\antigravity\brain\47e70075-75de-4e97-8ac9-b7d06c186d8f\git_workflow_for_vibe_coders.html"
PDF_ARTIFACT_PATH = r"C:\Users\Sanjay\.gemini\antigravity\brain\47e70075-75de-4e97-8ac9-b7d06c186d8f\git_workflow_for_vibe_coders.pdf"
PDF_WORKSPACE_PATH = r"F:\Codex\Japanese flash cards\git_workflow_for_vibe_coders.pdf"

with open(MD_PATH, "r", encoding="utf-8") as f:
    md_content = f.read()

html_body = markdown.markdown(
    md_content,
    extensions=["fenced_code", "tables", "toc", "attr_list"]
)

def process_code_blocks(html):
    def replace_code(match):
        code = match.group(1).replace("<", "&lt;").replace(">", "&gt;")
        return f'<pre class="code-block"><code>{code}</code></pre>'
    return re.sub(r'<p><code>(.*?)</code></p>', replace_code, html, flags=re.DOTALL)

html_body = process_code_blocks(html_body)

full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>The Vibe Coder's Guide to Git & GitHub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page {{ size: A4; margin: 16mm 14mm 16mm 14mm; }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10.5pt; line-height: 1.6; color: #1e293b; background: #ffffff;
    }}
    .header-banner {{ border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; }}
    h1 {{ font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 6px; }}
    h2 {{ font-size: 13.5pt; font-weight: 700; color: #0369a1; margin-top: 20px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; page-break-after: avoid; }}
    h3 {{ font-size: 11pt; font-weight: 700; color: #0f172a; margin-top: 14px; margin-bottom: 6px; page-break-after: avoid; }}
    p {{ margin-bottom: 10px; color: #334155; }}
    ul, ol {{ margin-bottom: 12px; padding-left: 20px; }}
    li {{ margin-bottom: 4px; color: #334155; }}
    strong {{ color: #0f172a; font-weight: 600; }}
    code {{ font-family: 'JetBrains Mono', monospace; font-size: 9pt; background: #f1f5f9; color: #0284c7; padding: 2px 5px; border-radius: 4px; border: 1px solid #e2e8f0; }}
    pre, .code-block {{ font-family: 'JetBrains Mono', monospace; font-size: 8.5pt; line-height: 1.45; background: #0f172a; color: #f8fafc; padding: 12px 14px; border-radius: 8px; margin: 12px 0; overflow-x: auto; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }}
    table {{ width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 9.5pt; page-break-inside: avoid; }}
    th {{ background: #0f172a; color: #ffffff; font-weight: 600; text-align: left; padding: 8px 10px; border: 1px solid #0f172a; }}
    td {{ padding: 7px 10px; border: 1px solid #cbd5e1; color: #334155; vertical-align: top; }}
    tr:nth-child(even) td {{ background: #f8fafc; }}
  </style>
</head>
<body>
  <div class="header-banner">
    <p style="font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: #0284c7; margin-bottom: 2px;">Git & Version Control Manual</p>
  </div>
  {html_body}
</body>
</html>
"""

with open(HTML_OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write(full_html)

edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_exe):
    edge_exe = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

temp_user_data = os.path.join(tempfile.gettempdir(), "edge_git_pdf_temp")
cmd = [edge_exe, "--headless", "--disable-gpu", f"--user-data-dir={temp_user_data}", f"--print-to-pdf={PDF_ARTIFACT_PATH}", HTML_OUTPUT_PATH]
subprocess.run(cmd, capture_output=True, text=True)

if os.path.exists(PDF_ARTIFACT_PATH):
    shutil.copyfile(PDF_ARTIFACT_PATH, PDF_WORKSPACE_PATH)
    print("Git PDF generated successfully!")
