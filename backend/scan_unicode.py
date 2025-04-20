import os

def scan_for_unicode_chars(directory): 
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.py', '.html', '.txt')) and not 'env' in root and not 'venv' in root:
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        for i, char in enumerate(content):
                            if ord(char) > 127:  # Non-ASCII character
                                print(f'File: {filepath}, position: {i}, char: {char}, Unicode: U+{ord(char):04X}')
                except Exception as e:
                    print(f'Error reading {filepath}: {e}')

if __name__ == "__main__":
    scan_for_unicode_chars('.')