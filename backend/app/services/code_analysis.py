import os
import structlog
from typing import Any, Dict, List, Optional

from app.services.parser.base import BaseParser, CodeNode
from app.services.parser.python_parser import PythonParser
from app.services.parser.ts_parser import TypeScriptParser

logger = structlog.get_logger()

_PARSERS_BY_EXT = {
    ".py": PythonParser,
    ".ts": TypeScriptParser,
    ".tsx": TypeScriptParser,
    ".js": TypeScriptParser,
    ".jsx": TypeScriptParser,
}

_IGNORED_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}


class CodeAnalysisService:
    """Parses a repository into structural CodeNodes using AST parsers."""

    def _get_parser(self, file_path: str) -> Optional[BaseParser]:
        ext = os.path.splitext(file_path)[1].lower()
        parser_cls = _PARSERS_BY_EXT.get(ext)
        return parser_cls() if parser_cls else None

    def analyze_file(self, file_path: str) -> Optional[CodeNode]:
        parser = self._get_parser(file_path)
        if parser is None:
            return None
        try:
            return parser.parse_file(file_path)
        except Exception as e:
            logger.warning("Failed to parse file", file_path=file_path, error=str(e))
            return None

    async def parse_repository(self, repo_path: str) -> Dict[str, Any]:
        """Walk a repository and produce a structural summary of parsed files."""
        logger.info("Parsing repository", repo_path=repo_path)

        if not os.path.isdir(repo_path):
            return {"status": "error", "error": "Repository path not found", "files": []}

        files: List[Dict[str, Any]] = []
        symbol_count = 0

        for root, dirs, filenames in os.walk(repo_path):
            dirs[:] = [d for d in dirs if d not in _IGNORED_DIRS]
            for filename in filenames:
                full_path = os.path.join(root, filename)
                node = self.analyze_file(full_path)
                if node is None:
                    continue
                rel_path = os.path.relpath(full_path, repo_path)
                symbols = [child.to_dict() for child in node.children]
                symbol_count += len(symbols)
                files.append({
                    "file_path": rel_path,
                    "language": os.path.splitext(filename)[1].lstrip("."),
                    "symbols": symbols,
                })

        return {
            "status": "parsed",
            "files_parsed": len(files),
            "symbols_found": symbol_count,
            "files": files,
        }


code_analysis_service = CodeAnalysisService()
