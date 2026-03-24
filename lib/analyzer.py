"""
Analyzes Java and Kotlin source files for metrics:
- Lines of code (excluding blank lines and comments)
- Class declarations (class, interface, enum, object, data class, sealed class, etc.)
"""

import re
import os

CLASS_PATTERN = re.compile(
    r'^\s*(?:(?:public|private|protected|internal|abstract|sealed|final|open|data|inner)\s+)*'
    r'(?:class|interface|enum|object)\s+(\w+)'
)


def analyze_file(content, file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in ('.java', '.kt'):
        return None

    lines = content.split('\n')
    code_lines = 0
    class_names = []
    in_block_comment = False

    for line in lines:
        trimmed = line.strip()

        if in_block_comment:
            if '*/' in trimmed:
                in_block_comment = False
            continue

        if trimmed.startswith('/*'):
            if '*/' not in trimmed:
                in_block_comment = True
            continue

        if trimmed == '' or trimmed.startswith('//'):
            continue

        code_lines += 1

        match = CLASS_PATTERN.match(trimmed)
        if match:
            class_names.append({
                'name': match.group(1),
                'file': file_path,
                'language': 'java' if ext == '.java' else 'kotlin',
            })

    return {
        'language': 'java' if ext == '.java' else 'kotlin',
        'lines': code_lines,
        'classes': len(class_names),
        'class_names': class_names,
    }


def aggregate_metrics(file_results):
    metrics = {
        'total_lines': 0,
        'java_lines': 0,
        'kotlin_lines': 0,
        'total_classes': 0,
        'java_classes': 0,
        'kotlin_classes': 0,
        'total_files': 0,
        'java_files': 0,
        'kotlin_files': 0,
    }

    all_classes = []

    for result in file_results:
        if result is None:
            continue

        metrics['total_lines'] += result['lines']
        metrics['total_classes'] += result['classes']
        metrics['total_files'] += 1

        if result['language'] == 'java':
            metrics['java_lines'] += result['lines']
            metrics['java_classes'] += result['classes']
            metrics['java_files'] += 1
        else:
            metrics['kotlin_lines'] += result['lines']
            metrics['kotlin_classes'] += result['classes']
            metrics['kotlin_files'] += 1

        all_classes.extend(result['class_names'])

    metrics['class_list'] = all_classes
    return metrics
