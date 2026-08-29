import asyncio
import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.agents.workflows.coding_workflow import create_coding_workflow, build_initial_state
from langchain_core.messages import HumanMessage

async def main():
    workflow = create_coding_workflow()
    print("Workflow compiled successfully.")
    state = build_initial_state("Explain the project architecture", "test-project-123", "user1")
    
    # Run the retriever node
    try:
        # LangGraph invoke
        print("Invoking workflow...")
        result = await workflow.ainvoke(state)
        print("Success!")
    except Exception as e:
        import traceback
        print(f"Error invoking workflow:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
