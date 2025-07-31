#!/usr/bin/env python3
import os
import re

def update_file(filename):
    print(f"Updating {filename}...")
    
    with open(filename, 'r') as f:
        content = f.read()
    
    # Add CSS variables if not present
    if ':root {' not in content:
        css_vars = '''    :root {
      --bg-primary: #191C24;
      --bg-secondary: #111111;
      --bg-tertiary: #1a1a1a;
      --text-primary: #ffffff;
      --text-secondary: #cccccc;
      --text-muted: #888;
      --accent-color: #6366f1;
      --accent-hover: #5855eb;
      --border-color: #333;
      --success-color: #10b981;
      --error-color: #ef4444;
      --required-asterisk: #a855f7;
      --spacing-xs: 0.5rem;
      --spacing-sm: 1rem;
      --spacing-md: 1.5rem;
      --spacing-lg: 2rem;
      --spacing-xl: 3rem;
    }
    
'''
        content = content.replace('<style>', '<style>\n' + css_vars)
    
    # Add asterisk styling
    if 'label .required-asterisk' not in content:
        asterisk_css = '''    label .required-asterisk {
      color: var(--required-asterisk);
      font-weight: 600;
      margin-left: 2px;
    }
'''
        # Find the label CSS and add after it
        label_pattern = r'(label\s*\{[^}]*\})'
        match = re.search(label_pattern, content)
        if match:
            content = content.replace(match.group(1), match.group(1) + '\n' + asterisk_css)
    
    # Update form container styling
    content = re.sub(
        r'\.form-container\s*\{[^}]*\}',
        '''    .form-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 32px;
      scroll-margin-top: var(--spacing-lg);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
    }''',
        content
    )
    
    # Update input/textarea styling
    content = re.sub(
        r'input,\s*textarea\s*\{[^}]*\}',
        '''    input, textarea {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid #333;
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
      background: #1a1a1a;
      color: #ffffff;
      transition: all 0.2s ease;
    }''',
        content
    )
    
    # Update focus states
    content = re.sub(
        r'input:focus,\s*textarea:focus\s*\{[^}]*\}',
        '''    input:focus, textarea:focus {
      border-color: var(--accent-color);
      outline: none;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      background: #222;
    }''',
        content
    )
    
    # Add hover states
    if 'input:hover, textarea:hover' not in content:
        hover_css = '''    input:hover, textarea:hover {
      border-color: #444;
      background: #1f1f1f;
    }
'''
        # Add after input:focus, textarea:focus
        focus_pattern = r'(input:focus,\s*textarea:focus\s*\{[^}]*\})'
        match = re.search(focus_pattern, content)
        if match:
            content = content.replace(match.group(1), match.group(1) + '\n' + hover_css)
    
    # Update submit button styling
    content = re.sub(
        r'\.submit-btn\s*\{[^}]*\}',
        '''    .submit-btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, var(--accent-color), var(--accent-hover));
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 1.5rem;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
    }''',
        content
    )
    
    # Update submit button hover
    content = re.sub(
        r'\.submit-btn:hover\s*\{[^}]*\}',
        '''    .submit-btn:hover {
      background: linear-gradient(135deg, var(--accent-hover), var(--accent-color));
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }''',
        content
    )
    
    # Add submit button active state
    if '.submit-btn:active' not in content:
        active_css = '''    .submit-btn:active {
      transform: translateY(0);
    }
'''
        # Add after submit-btn:hover
        hover_pattern = r'(\.submit-btn:hover\s*\{[^}]*\})'
        match = re.search(hover_pattern, content)
        if match:
            content = content.replace(match.group(1), match.group(1) + '\n' + active_css)
    
    # Update question section styling
    content = re.sub(
        r'\.question-section\s*\{[^}]*\}',
        '''    .question-section {
      margin-top: 2.5rem;
      padding: 24px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }''',
        content
    )
    
    # Update HTML labels to use span for asterisks
    content = re.sub(
        r'<label for="([^"]+)">([^<]+) \*</label>',
        r'<label for="\1">\2<span class="required-asterisk">*</span></label>',
        content
    )
    
    # Update question titles
    content = re.sub(
        r'<div class="question-title">([^<]+): \*</div>',
        r'<div class="question-title">\1:<span class="required-asterisk">*</span></div>',
        content
    )
    
    with open(filename, 'w') as f:
        f.write(content)
    
    print(f"Updated {filename}")

def main():
    html_files = [
        'product-engineer.html',
        'enterprise-ae.html',
        'enterprise-product-engineer.html',
        'emerging-enterprise.html',
        'infrastructure-engineer.html',
        'research-engineer.html'
    ]
    
    for filename in html_files:
        if os.path.exists(filename):
            update_file(filename)
        else:
            print(f"File {filename} not found")

if __name__ == "__main__":
    main()