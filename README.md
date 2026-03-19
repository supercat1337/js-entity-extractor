# JS Entity Extractor 🔍

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful command-line tool to extract user-defined **classes, functions, variables, parameters, methods, and properties** from JavaScript files. Perfect for code analysis, documentation generation, and migration tasks.

## ✨ Features

- 📦 Extracts **all named entities**:
    - `class` – class declarations
    - `function` – function declarations
    - `variable` – variables (including destructuring)
    - `parameter` – function/method parameters (with context)
    - `method` – class and object methods (including constructors)
    - `property` – class fields, object properties, getters/setters
- 🔍 **Modern JavaScript support** – understands optional chaining, nullish coalescing, and all ES2022+ syntax (via `espree`).
- 🌐 **Glob patterns & recursion** – process entire projects with ease.
- 🚫 **Exclude patterns** – ignore test files, node_modules, etc.
- 📄 **Two output formats**:
    - **Summary JSON** – unique names per type.
    - **NDJSON** – detailed entity-by-entity data.
- 🎯 **Flexible filtering** – choose which types to include, enable local declarations, or restrict to exported entities.
- 🖥️ **CLI-first** – designed for integration into build pipelines and scripts.

## Installation 📦

Install directly from GitHub:

```bash
npm install https://github.com/supercat1337/js-entity-extractor
```

To use the `js-entity-extractor` command globally in your terminal:

```bash
cd node_modules/@supercat1337/js-entity-extractor
npm link
```

## 🚀 Usage

```bash
js-entity-extractor [patterns...] [options]
```

### Basic examples

```bash
# Extract everything from all .js files in src/
js-entity-extractor "src/**/*.js" -o report.json

# Only classes and functions, including locals, save NDJSON as well
js-entity-extractor "src/**/*.js" --types class function --include-locals --ndjson full.ndjson

# Exclude test files and node_modules
js-entity-extractor . -r --exclude "**/*.test.js" --exclude "node_modules/**" -o analysis.json

# Show summary in stdout (no output file)
js-entity-extractor "lib/*.js"

# Generate a dictionary of all names for autocompletion or spell-checking
js-entity-extractor "src/**/*.js" --dictionary names.txt

# Generate a clean dictionary with only valid identifiers
js-entity-extractor "src/**/*.js" -d names.txt --dictionary-valid-only
```

## ⚙️ Options

| Option                    | Description                                                                           | Default |
| ------------------------- | ------------------------------------------------------------------------------------- | ------- |
| `-o, --output <file>`     | Write summary JSON to `<file>`. If omitted and no `--ndjson`, prints to stdout.       | –       |
| `--ndjson <file>`         | Write full NDJSON data to `<file>`.                                                   | –       |
| `-r, --recursive`         | For directory paths, automatically add `/**/*.js`.                                    | `false` |
| `-t, --types <types...>`  | Types to include: `class`, `function`, `variable`, `parameter`, `method`, `property`. | all     |
| `--include-locals`        | Include local declarations inside functions/blocks (default: true)                    | `true`  |
| `--globals-only`          | Only include global declarations (equivalent to --no-include-locals)                  | `false` |
| `--exported-only`         | Only include exported entities.                                                       | `false` |
| `--exclude <pattern>`     | Exclude files/directories matching glob (can be repeated).                            | `[]`    |
| `-h, --help`              | Show help.                                                                            | –       |
| `-d, --dictionary <file>` | Write a flat text file with all unique entity names (one per line)                    |         |
| `--dictionary-valid-only` | When used with --dictionary, only include names that are valid JavaScript             |         |

> **Note:** Both kebab-case (`--include-locals`) and camelCase (`--includeLocals`) are accepted for all options.

## 📊 Output Format

### Summary JSON

```json
{
    "classes": ["MyClass", "AnotherClass"],
    "functions": ["foo", "bar"],
    "variables": ["x", "y"],
    "parameters": ["a", "b", "callback"],
    "methods": ["render", "update", "constructor"],
    "properties": ["width", "height", "color"]
}
```

### NDJSON (each line is a separate JSON object)

```json
{"file":"src/index.js","name":"myFunc","type":"function","line":10,"exported":true}
{"file":"src/index.js","name":"x","type":"variable","line":12,"exported":false}
{"file":"src/utils.js","name":"element","type":"parameter","line":5,"exported":false,"functionName":"fadeIn"}
{"file":"src/component.js","name":"render","type":"method","line":42,"exported":false}
{"file":"src/component.js","name":"color","type":"property","line":18,"exported":false}
```

## 🧪 Advanced Examples

### Extract only public API (exported classes and functions)

```bash
js-entity-extractor "src/**/*.js" --types class function --exported-only -o public-api.json
```

### Analyse a React project (ignore JSX, but extract methods and properties)

```bash
js-entity-extractor "src/**/*.js" --types method property --include-locals --exclude "**/*.test.js" -o components-analysis.json
```

### Generate a full entity dump for further processing

```bash
js-entity-extractor "lib/**/*.js" --ndjson entities.ndjson
```

### Use with `jq` to count occurrences

```bash
js-entity-extractor "src/**/*.js" --ndjson - | jq -s 'group_by(.type) | map({type: .[0].type, count: length})'
```

## 📄 License

MIT © Supercat1337 (Albert Bazaleev)

---

**Made with ❤️ for the JavaScript community.**
