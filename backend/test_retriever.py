import asyncio
import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.agents.retriever import RetrievalAgent
from app.agents.workflows.coding_workflow import _retriever_node, run_retriever, create_coding_workflow

async def main():
    agent = RetrievalAgent()
    state = {
        "messages": [],
        "project_id": "test-project-123",
    }
    
    # Try calling _retriever_node
    print(f"Calling _retriever_node with state...")
    try:
        ret = _retriever_node(state, agent)
        print(f"Type of ret: {type(ret)}")
        if asyncio.iscoroutine(ret):
            print("It returned a coroutine!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
