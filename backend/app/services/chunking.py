import os
import structlog
from typing import List, Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.services.parser.base import BaseParser, CodeNode
from app.services.parser.python_parser import PythonParser
from app.services.parser.ts_parser import TypeScriptParser

logger = structlog.get_logger()


class ChunkingService:
    """Service to chunk code and text for embeddings"""

    # Map file extensions to the language-specific parser to use.
    _PARSERS_BY_EXT = {
        ".py": PythonParser,
        ".ts": TypeScriptParser,
        ".tsx": TypeScriptParser,
        ".js": TypeScriptParser,
        ".jsx": TypeScriptParser,
    }

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            is_separator_regex=False,
        )

    def _get_parser(self, file_path: str) -> Optional[BaseParser]:
        ext = os.path.splitext(file_path)[1].lower()
        parser_cls = self._PARSERS_BY_EXT.get(ext)
        return parser_cls() if parser_cls else None

    def chunk_text(self, text: str, metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Split text into overlapping chunks"""
        chunks = self.text_splitter.split_text(text)
        return [
            {
                "content": chunk,
                "metadata": {**(metadata or {})}
            }
            for chunk in chunks
        ]

    def chunk_code_node(self, node: CodeNode, file_path: str) -> List[Dict[str, Any]]:
        """Chunk a single CodeNode, splitting oversized nodes into text chunks."""
        base_metadata = {
            "file_path": file_path,
            "type": node.type,
            "name": node.name,
            "start_line": node.start_line,
            "end_line": node.end_line,
        }
        return self._split_with_metadata(node.content, base_metadata)

    def chunk_file(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Chunk file content using a language-specific AST parser when
        available, falling back to plain recursive text chunking otherwise."""
        parser = self._get_parser(file_path)
        if parser is None:
            return self.chunk_text(content, metadata={"file_path": file_path})

        try:
            root = parser.parse_content(content, file_path)
        except Exception as e:
            logger.warning(
                "AST parse failed, falling back to text chunking",
                file_path=file_path,
                error=str(e),
            )
            return self.chunk_text(content, metadata={"file_path": file_path})

        leaves = self._collect_leaves(root)
        if not leaves:
            # No structural nodes found (e.g. a config-like module); chunk text.
            return self.chunk_text(content, metadata={"file_path": file_path})

        chunks: List[Dict[str, Any]] = []
        for node in leaves:
            chunks.extend(self.chunk_code_node(node, file_path))
        return chunks

    def _collect_leaves(self, node: CodeNode) -> List[CodeNode]:
        """Return the most granular structural nodes (functions/methods and
        classes without parsed children) for embedding."""
        if not node.children:
            # Skip the synthetic module root when it has no children.
            return [node] if node.type != "module" else []

        leaves: List[CodeNode] = []
        for child in node.children:
            if child.children:
                leaves.extend(self._collect_leaves(child))
            else:
                leaves.append(child)
        return leaves

    def _split_with_metadata(self, text: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        pieces = self.text_splitter.split_text(text) or [text]
        return [{"content": piece, "metadata": {**metadata}} for piece in pieces]


chunking_service = ChunkingService()
