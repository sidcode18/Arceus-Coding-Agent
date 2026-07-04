import ast
from typing import List

from app.services.parser.base import BaseParser, CodeNode

class PythonParser(BaseParser):
    """AST Parser for Python using built-in ast module"""
    
    def parse_file(self, file_path: str) -> CodeNode:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return self.parse_content(content, file_path)
        
    def parse_content(self, content: str, filename: str) -> CodeNode:
        tree = ast.parse(content, filename=filename)
        lines = content.split('\n')
        
        root = CodeNode(
            name=filename,
            type="module",
            content=content,
            start_line=1,
            end_line=len(lines)
        )
        
        self._extract_nodes(tree, root, lines)
        return root
        
    def _extract_nodes(self, node: ast.AST, parent: CodeNode, lines: List[str]):
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                start = child.lineno
                end = child.end_lineno or start
                
                content_lines = lines[start-1:end]
                content = '\n'.join(content_lines)
                
                node_type = "class" if isinstance(child, ast.ClassDef) else "function"
                
                code_node = CodeNode(
                    name=child.name,
                    type=node_type,
                    content=content,
                    start_line=start,
                    end_line=end
                )
                parent.children.append(code_node)
                
                # Recursively extract methods inside classes
                if isinstance(child, ast.ClassDef):
                    self._extract_nodes(child, code_node, lines)
