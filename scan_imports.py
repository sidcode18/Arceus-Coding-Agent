import os
import ast
import sys

def get_imports(path):
    imports = set()
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        tree = ast.parse(f.read())
                        for node in ast.walk(tree):
                            if isinstance(node, ast.Import):
                                for alias in node.names:
                                    imports.add(alias.name.split('.')[0])
                            elif isinstance(node, ast.ImportFrom):
                                if node.module and node.level == 0:
                                    imports.add(node.module.split('.')[0])
                except Exception as e:
                    print(f"Failed to parse {file_path}: {e}")
    return imports

stdlib_names = sys.stdlib_module_names if hasattr(sys, 'stdlib_module_names') else set()

found_imports = get_imports('backend/app').union(get_imports('backend/tests'))
third_party = sorted([i for i in found_imports if i not in stdlib_names and i != 'app'])

print("Third-party imports used in backend/app:")
for imp in third_party:
    print(f"- {imp}")
