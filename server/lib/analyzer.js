/**
 * Analyzes Java and Kotlin source files for metrics:
 * - Lines of code (excluding blank lines and comments)
 * - Class declarations (class, interface, enum, object, data class, sealed class, etc.)
 */

const CLASS_PATTERN = /^\s*(?:public\s+|private\s+|protected\s+|internal\s+|abstract\s+|sealed\s+|final\s+|open\s+|data\s+|inner\s+)*(?:class|interface|enum|object)\s+\w+/;

function analyzeFileContent(content, filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  if (ext !== 'java' && ext !== 'kt') {
    return null;
  }

  const lines = content.split('\n');
  let codeLines = 0;
  let classCount = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle block comments
    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    // Skip blank lines and single-line comments
    if (trimmed === '' || trimmed.startsWith('//')) {
      continue;
    }

    codeLines++;

    // Check for class declarations
    if (CLASS_PATTERN.test(trimmed)) {
      classCount++;
    }
  }

  return {
    language: ext === 'java' ? 'java' : 'kotlin',
    lines: codeLines,
    classes: classCount,
  };
}

function aggregateMetrics(fileResults) {
  const metrics = {
    total_lines: 0,
    java_lines: 0,
    kotlin_lines: 0,
    total_classes: 0,
    java_classes: 0,
    kotlin_classes: 0,
    total_files: 0,
    java_files: 0,
    kotlin_files: 0,
  };

  for (const result of fileResults) {
    if (!result) continue;

    metrics.total_lines += result.lines;
    metrics.total_classes += result.classes;
    metrics.total_files += 1;

    if (result.language === 'java') {
      metrics.java_lines += result.lines;
      metrics.java_classes += result.classes;
      metrics.java_files += 1;
    } else {
      metrics.kotlin_lines += result.lines;
      metrics.kotlin_classes += result.classes;
      metrics.kotlin_files += 1;
    }
  }

  return metrics;
}

module.exports = { analyzeFileContent, aggregateMetrics };
