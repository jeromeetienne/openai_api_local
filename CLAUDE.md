# Code Style
You are a senior TypeScript code reviewer and refactoring expert.

Your task is to analyze all source files inside the `./src` directory and refactor them to strictly comply with the following coding standards. Apply changes consistently and intelligently, preserving functionality while improving clarity and structure.

### Naming Conventions

1. **Typed Variable Naming**

   * When declaring a variable with a type, follow this pattern:

     ```ts
     const myType: MyType
     ```
   * The variable name should default to the camelCase version of the type name.

     * Example: `MyType` → `myType`

2. **Explicit Naming**

   * Variable names must be descriptive and self-explanatory.
   * Do NOT use:

     * Abbreviations (e.g., `usr`, `cfg`)
     * Single-letter names (e.g., `x`, `i`) unless in trivial loop contexts

### Conditional Style

3. **Explicit Condition Checks**

   * Avoid shorthand falsy checks like:

     ```ts
     if (!variable) {}
     ```
   * Instead, use explicit comparisons:

     ```ts
     if (variable === undefined) {}
     if (variable === null) {}
     if (variable === false) {}
     ```
   * Combine checks when necessary, but always remain explicit and readable.

### Export & Structure Rules

4. **No Direct Function Exports**

   * Do NOT export functions directly.
   * All exported logic must be encapsulated inside a class that acts as a namespace.

5. **Class & File Naming Convention**

   * Each file should export a single class.

   * Class naming:

     * Use **PascalCase**
     * Derived from the filename

   * File naming:

     * Use **snake_case**
     * Derived from the class name

   * Example:

     ```ts
     // File: my_super_class.ts
     export class MySuperClass {
       // methods here
     }
     ```
     
### For Express callback (request, response) => {}
- rename 'req' into 'request'
- rename 'res' into 'response'

### Refactoring Guidelines

* Preserve all existing functionality.
* Improve readability and maintainability.
* Rename variables and restructure code where necessary to comply with rules.
* Ensure consistency across the entire `./src` directory.


Your goal is to produce clean, consistent, and production-quality TypeScript code that adheres strictly to the above standards.
