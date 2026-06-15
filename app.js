// DOM Elements
const markdownInput = document.getElementById('markdownInput');
const cssInput = document.getElementById('cssInput');
const documentContainer = document.querySelector('.documentContainer');
const userStylesTag = document.getElementById('user-styles');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const fileInput = document.getElementById('fileInput');

// Tab Buttons
const tabMd = document.getElementById('tab-md');
const tabCss = document.getElementById('tab-css');

// --- 1. DEFAULT DATA ---
const DEFAULT_TEXT = `# Homebrewery HTML
This is a simplified and lightweight webpage
based on NaturalCrit's Homebrewery, accessible
[here](https://github.com/naturalcrit/homebrewery).

\\column

## Running Locally?
Press the Load button in the lower right corner
and select the 'example.txt' file included with this 
to see this project in action.`;
const DEFAULT_CSS = `/* Custom Theme Styles */
.pageContent h1 {
  color: #58180d;
  font-family: 'Times New Roman', serif;
  border-bottom: 2px solid #c9ad6a;
  margin-top: 0;
}`;

(async () => {
  try {
    const res = await fetch('example.txt');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const file = new File([text], 'example.txt', { type: 'text/plain' });
    await loadCombinedFile(file)

    markdownInput.value = markdownContent;
    cssInput.value = cssContent;
    
    updatePreview();
    updateCustomCSS();
  } catch (error) {
    markdownInput.value = DEFAULT_TEXT;
    cssInput.value = DEFAULT_CSS;
  }
})();

// --- SAVE FUNCTION ---
const DELIM = '\n-----DELIMITER_MARKDOWN_CSS-----\n';
let markdownContent = '';
let cssContent = '';
const setMarkdown = v => { markdownContent = v };
const setCSS = v => { cssContent = v };

function saveCombined(filename = 'content.txt') {
  // Ensure markdown & css are strings and preserve exact content
  const md = String(markdownInput.value);
  const css = String(cssInput.value);
  const blob = new Blob([md, DELIM, css], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadCombinedFile(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) return reject(new TypeError('Argument must be a File'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const text = String(reader.result || '');
      const idx = text.indexOf(DELIM);
      if (idx === -1) {
        // If delimiter not found, assume whole file is markdown and css is empty
        setMarkdown(text);
        setCSS('');
        return resolve({ markdown: text, css: '' });
      }
      const md = text.slice(0, idx);
      const css = text.slice(idx + DELIM.length);
      setMarkdown(md);
      setCSS(css);
      resolve({ markdown: md, css: css });
    };
    reader.readAsText(file, 'utf-8');
  });
}

saveButton.addEventListener('click', () => {
    saveCombined('markdown_and_css.txt');
});

// --- LOAD FUNCTION ---
loadButton.addEventListener('click', () => {
  fileInput.value = '';
  fileInput.click();
});

fileInput.addEventListener('change', async () => {
  const f = fileInput.files && fileInput.files[0];
  if (!f) return;
  try {
    await loadCombinedFile(f);
    markdownInput.value = markdownContent;
    cssInput.value = cssContent;
    
    updatePreview();
    updateCustomCSS();

  } catch (err) {
    console.error(err);
    alert(err.message || 'Error loading file');
  }
});

// --- CUSTOM CLASSES HELPER ---
function processCustomSyntax(text) {
    // 1. BLOCK-LEVEL MUSTACHE (Handles \r\n and \n universally)
    // Matches: {{className[optional spaces][newline or return] content [newline or return]}}
    let processed = text.replace(/\{\{([a-zA-Z0-9\-_]+)\s*\r?\n([\s\S]*?)\r?\n\}\}/g, (match, className, content) => {
        const parsedContent = marked.parse(content);
        return `<div class="${className}">${parsedContent}</div>`;
    });
 
    // 2. INLINE-LEVEL MUSTACHE (Strictly single-line only)
    // The [^\r\n] ensures it will NEVER match if there is a line break inside the braces.
    processed = processed.replace(/\{\{([a-zA-Z0-9\-_]+)\s+([^\r\n<>]*?)\}\}/g, (match, className, content) => {
      const parsedContent = marked.parse(content);
        return `<span class="${className}">${parsedContent}</span>`;
    });

    // This matches text followed by a single set of curly braces containing CSS
    processed = processed.replace(/^([^\n]+)\s*\{([^}]+)\}/gm, (match, textContent, cssRules) => {
    // Wrap the text in a span with the CSS injected directly as an inline style
        const parsedText = marked.parse(textContent).replace(/^<p>|<\/p>$/g, '');
        return `<span style="${cssRules.trim()}">${parsedText}</span>`;
    });
 
    // 3. COLUMN BREAKS
    processed = processed.replace(/\\column/g, '<div class="column-break"></div>');
 
    return processed;
}

// --- 2. THE RENDERING ENGINE ---
function updatePreview() {
    const rawMarkdown = markdownInput.value;
    documentContainer.innerHTML = '';
    
    const pagesTextArray = rawMarkdown.split('\\page');
    
    pagesTextArray.forEach((pageContent, index) => {
        const pageSection = document.createElement('section');
        pageSection.className = 'page';

        pageSection.id = `page-${index + 1}`;
        
        const pageInner = document.createElement('div');
        pageInner.className = 'pageContent';
        
        // const processedHTML = pageContent.replace(/\\column/g, '<div class="column-break"></div>');
        const processedHTML = processCustomSyntax(pageContent);
        
        pageInner.innerHTML = marked.parse(processedHTML);
        pageSection.appendChild(pageInner);
        documentContainer.appendChild(pageSection);
    });
}

// --- 3. LIVE CSS INJECTION ---
function updateCustomCSS() {
    // Take the raw string from the CSS box and drop it straight into the <style> tag
    userStylesTag.textContent = cssInput.value;
}

// --- 4. TAB UI TOGGLING ---
tabMd.addEventListener('click', () => {
    tabMd.classList.add('active');
    tabCss.classList.remove('active');
    markdownInput.classList.remove('hidden');
    cssInput.classList.add('hidden');
});

tabCss.addEventListener('click', () => {
    tabCss.classList.add('active');
    tabMd.classList.remove('active');
    cssInput.classList.remove('hidden');
    markdownInput.classList.add('hidden');
});

// --- 5. INITIALIZATION ---
markdownInput.addEventListener('input', updatePreview);
cssInput.addEventListener('input', updateCustomCSS); // Watch the CSS box for typing

// --- SAVE FUNCTION OVERWRITE ---
window.addEventListener('keydown', (e) => {
  const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
  if (!isSave) return;
  e.preventDefault();
  saveCombined('markdown_and_css.txt');
});

// Pressing tab to add 4 spaces in cssInput
cssInput.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();

            if (!document.execCommand("insertText", false, "    ")) {
                const start = this.selectionStart;
                const end = this.selectionEnd;
                const value = this.value;

                this.value = value.substring(0, start) + "    " + value.substring(end);

                this.selectionStart = this.selectionEnd = start + 4;
            }
        }
    });

updatePreview();
updateCustomCSS(); // Run it once at the start so default styles apply
