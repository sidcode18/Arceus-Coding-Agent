from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

class BaseMemoryStore(ABC):
    """Abstract base class for memory stores"""
    
    @abstractmethod
    async def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Add a message to the memory store"""
        pass
        
    @abstractmethod
    async def get_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get messages for a session"""
        pass
        
    @abstractmethod
    async def clear_session(self, session_id: str) -> bool:
        """Clear all memory for a session"""
        pass
