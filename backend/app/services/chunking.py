from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter

class ChunkingService:
    """Service to chunk code and text for embeddings"""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            is_separator_regex=False,
        )
        
    def chunk_text(self, text: str, metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Split text into overlapping chunks"""
        chunks = self.text_splitter.split_text(text)
        return [
            {
                "content": chunk,
                "metadata": metadata or {}
            }
            for chunk in chunks
        ]
        
    def chunk_code_node(self, node: Any, file_path: str) -> List[Dict[str, Any]]:
        """Chunk a CodeNode (AST). In a real implementation this would chunk the code semantically"""
        return self.chunk_text(
            node.content,
            metadata={"file_path": file_path, "type": node.type, "name": node.name}
        )

chunking_service = ChunkingService()
