import re
from typing import List

from app.services.parser.base import BaseParser, CodeNode

class TypeScriptParser(BaseParser):
    """Basic Regex-based Parser for TypeScript (Fallback/Stub)"""
    
    def parse_file(self, file_path: str) -> CodeNode:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return self.parse_content(content, file_path)
        
    def parse_content(self, content: str, filename: str) -> CodeNode:
        lines = content.split('\n')
        
        root = CodeNode(
            name=filename,
            type="module",
            content=content,
            start_line=1,
            end_line=len(lines)
        )
        
        # Very naive regex for classes and functions
        class_pattern = re.compile(r'class\s+([A-Za-z0-9_]+)')
        func_pattern = re.compile(r'(?:function\s+|const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|([A-Za-z0-9_]+)\s*\(.*\)\s*\{)')
        
        for i, line in enumerate(lines):
            class_match = class_pattern.search(line)
            if class_match:
                # Stub node, in reality we'd need to match braces
                root.children.append(CodeNode(
                    name=class_match.group(1),
                    type="class",
                    content=line,
                    start_line=i + 1,
                    end_line=i + 1
                ))
                continue
                
            func_match = func_pattern.search(line)
            if func_match:
                name = func_match.group(1) or func_match.group(2) or "anonymous"
                root.children.append(CodeNode(
                    name=name,
                    type="function",
                    content=line,
                    start_line=i + 1,
                    end_line=i + 1
                ))
                
        return root
