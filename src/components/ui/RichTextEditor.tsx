'use client';

import { useRef, useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import UnsplashImageSelector from './UnsplashImageSelector';

// Import TinyMCE locally to avoid API key requirements
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/codesample';

// TinyMCE CSS will be loaded dynamically via base_url configuration

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Enter content...",
  height = 300,
  disabled = false 
}: RichTextEditorProps) {
  const editorRef = useRef<any>(null);
  const [showUnsplashSelector, setShowUnsplashSelector] = useState(false);

  // Load TinyMCE CSS dynamically and configure license
  useEffect(() => {
    const loadCSS = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    loadCSS('/tinymce/skins/ui/oxide-dark/skin.min.css');
    loadCSS('/tinymce/skins/content/dark/content.min.css');
    
    // Load Prism.js for code syntax highlighting
    loadCSS('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css');
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js';
    script.onload = () => {
      // Load additional language support
      const languages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'php', 'ruby', 'go', 'rust', 'sql', 'html', 'css', 'json', 'xml', 'yaml', 'markdown', 'bash', 'powershell'];
      languages.forEach(lang => {
        const langScript = document.createElement('script');
        langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${lang}.min.js`;
        document.head.appendChild(langScript);
      });
      
      // Initialize Prism after all language scripts are loaded
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).Prism) {
          (window as any).Prism.highlightAll();
        }
      }, 1000);
    };
    document.head.appendChild(script);

    // Configure TinyMCE with GPL license
    if (typeof window !== 'undefined' && (window as any).tinymce) {
      (window as any).tinymce.init({
        license_key: 'gpl'
      });
    }
  }, []);

  const handleEditorChange = (content: string) => {
    onChange(content);
  };

  const handleEditorInit = (evt: any, editor: any) => {
    console.log('TinyMCE Editor initialized:', editor);
    editorRef.current = editor;
  };

  const handleUnsplashImageSelect = (imageUrl: string, attribution: string) => {
    if (editorRef.current) {
      editorRef.current.insertContent(`<img src="${imageUrl}" alt="${attribution}" style="max-width: 100%; height: auto;" />`);
      
    }
    setShowUnsplashSelector(false);
  };

  return (
    <div className="rich-text-editor">
      <Editor
        onInit={handleEditorInit}
        value={value}
        onEditorChange={handleEditorChange}
        disabled={disabled}
        licenseKey="gpl"
        init={{
          height: height,
          menubar: false,
          skin: 'oxide-dark',
          content_css: 'dark',
          base_url: '/tinymce',
          suffix: '.min',
          branding: false,
          promotion: false,
          min_height: height,
          max_height: 800,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'wordcount', 'codesample'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic forecolor backcolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | image unsplash | link | codesample | table | ' +
            'fullscreen',
          content_style: `
            body { 
              font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; 
              font-size: 14px; 
              color: #ffffff; 
              background-color: #1a1a1a; 
            }
            
            /* Enhanced code block styling for TinyMCE codesample */
            pre[class*="language-"] {
              background: #1e1e1e !important;
              border: 1px solid #3a3a3a !important;
              border-radius: 8px !important;
              padding: 16px !important;
              margin: 16px 0 !important;
              overflow-x: auto !important;
              position: relative !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
            }
            
            pre[class*="language-"] code {
              background: transparent !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              font-family: 'Fira Code', 'Monaco', 'Consolas', 'Courier New', monospace !important;
              font-size: 14px !important;
              line-height: 1.5 !important;
              color: #d4d4d4 !important;
              display: block !important;
            }
            
            /* Copy button styling */
            .copy-code-btn {
              position: absolute !important;
              top: 8px !important;
              right: 8px !important;
              background: #007acc !important;
              color: white !important;
              border: none !important;
              padding: 6px 12px !important;
              border-radius: 6px !important;
              cursor: pointer !important;
              font-size: 12px !important;
              font-weight: 500 !important;
              z-index: 10 !important;
              transition: all 0.2s ease !important;
              display: flex !important;
              align-items: center !important;
              gap: 4px !important;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
            }
            
            .copy-code-btn:hover {
              background: #005a9e !important;
              transform: translateY(-1px) !important;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
            }
            
            .copy-code-btn:active {
              transform: translateY(0) !important;
            }
          `,
          placeholder: placeholder,
          statusbar: true,
          resize: true,
          codesample_languages: [
            { text: 'HTML/XML', value: 'markup' },
            { text: 'JavaScript', value: 'javascript' },
            { text: 'TypeScript', value: 'typescript' },
            { text: 'Python', value: 'python' },
            { text: 'Java', value: 'java' },
            { text: 'C++', value: 'cpp' },
            { text: 'C#', value: 'csharp' },
            { text: 'PHP', value: 'php' },
            { text: 'Ruby', value: 'ruby' },
            { text: 'Go', value: 'go' },
            { text: 'Rust', value: 'rust' },
            { text: 'SQL', value: 'sql' },
            { text: 'CSS', value: 'css' },
            { text: 'JSON', value: 'json' },
            { text: 'YAML', value: 'yaml' },
            { text: 'Markdown', value: 'markdown' },
            { text: 'Bash', value: 'bash' },
            { text: 'PowerShell', value: 'powershell' }
          ],
          setup: (editor) => {
            // Add custom button for Unsplash images
            editor.ui.registry.addButton('unsplash', {
              icon: 'unsplash-icon',
              tooltip: 'Insert image from Unsplash',
              onAction: () => {
                setShowUnsplashSelector(true);
              }
            });

            // Add custom Unsplash icon
            editor.ui.registry.addIcon('unsplash-icon', 
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
              '<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>' +
              '<path d="M8 12l2-2 2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
              '<circle cx="9" cy="9" r="1" fill="currentColor"/>' +
              '</svg>'
            );

            // Add copy functionality to code blocks created by codesample plugin
            editor.on('init', () => {
              const addCopyButtons = () => {
                // Target code blocks created by TinyMCE codesample plugin
                const codeBlocks = editor.getBody().querySelectorAll('pre[class*="language-"] code');
                codeBlocks.forEach((block: Element) => {
                  const pre = block.parentElement;
                  if (pre && !pre.querySelector('.copy-code-btn')) {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-code-btn';
                    copyBtn.innerHTML = `
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Copy
                    `;
                    copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
                    copyBtn.onclick = (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const code = block.textContent || '';
                      navigator.clipboard.writeText(code).then(() => {
                        copyBtn.innerHTML = `
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20,6 9,17 4,12"></polyline>
                          </svg>
                          Copied!
                        `;
                        setTimeout(() => {
                          copyBtn.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy
                          `;
                        }, 2000);
                      }).catch(() => {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = code;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        
                        copyBtn.innerHTML = `
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20,6 9,17 4,12"></polyline>
                          </svg>
                          Copied!
                        `;
                        setTimeout(() => {
                          copyBtn.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy
                          `;
                        }, 2000);
                      });
                    };
                    
                    pre.style.position = 'relative';
                    pre.appendChild(copyBtn);
                  }
                });
              };

              // Add copy buttons when content changes
              editor.on('NodeChange', addCopyButtons);
              editor.on('SetContent', addCopyButtons);
              editor.on('ExecCommand', (e) => {
                if (e.command === 'mceCodeSample') {
                  // Add copy button after codesample is inserted
                  setTimeout(addCopyButtons, 100);
                }
              });
              
              // Initial add
              setTimeout(addCopyButtons, 100);
            });

          }
        }}
      />
      
      {showUnsplashSelector && (
        <div style={{ zIndex: 9999, position: 'relative' }}>
          <UnsplashImageSelector
            onImageSelect={handleUnsplashImageSelect}
            onClose={() => setShowUnsplashSelector(false)}
          />
        </div>
      )}
    </div>
  );
}
