import { describe, test, expect } from "bun:test";
import { parseMetadata, createFileWithMetadata } from "../logic/publish-code-snippet";

describe("Metadata Parser Tests", () => {
    test("should parse valid metadata", () => {
        const testContent = `---METADATA---
# Edit the metadata below. Keep the format exactly as shown (Title:, Description:, Language:, Tags:)
# Description needs to be at least 140 characters and Tags need at least 5 entries
# Don't remove the ---METADATA--- and ---CODE--- markers!

Title: Test Title
Description: This is a test description that is long enough to meet the required minimum length of 140 characters. It includes information about the code snippet and provides context for anyone who might want to use it.
Language: typescript
Tags: test, unit, parser, metadata, typescript
---CODE---
function testCode() {
    return "This is test code";
}
`;

        const result = parseMetadata(testContent);
        expect(result.metadata.title).toBe("Test Title");
        expect(result.metadata.description).toContain("This is a test description");
        expect(result.metadata.language).toBe("typescript");
        expect(result.metadata.tags).toEqual(["test", "unit", "parser", "metadata", "typescript"]);
        expect(result.code).toContain("function testCode()");
    });

    test("should parse metadata with blank lines", () => {
        const testContent = `---METADATA---
# Comments

Title: Test With Spaces

Description: This is a test description with blank lines that is long enough to meet the required minimum length of 140 characters. It includes information about the code snippet and provides context for anyone who might want to use it.

Language: javascript

Tags: test, blank, lines, metadata, parsing

---CODE---
console.log("hello world");
`;

        const result = parseMetadata(testContent);
        expect(result.metadata.title).toBe("Test With Spaces");
        expect(result.metadata.description).toContain("This is a test description with blank lines");
        expect(result.metadata.language).toBe("javascript");
        expect(result.metadata.tags).toEqual(["test", "blank", "lines", "metadata", "parsing"]);
        expect(result.code).toBe('console.log("hello world");\n');
    });

    test("should handle missing fields by returning empty strings", () => {
        const testContent = `---METADATA---
Title: Only Title
---CODE---
const x = 1;
`;

        const result = parseMetadata(testContent);
        expect(result.metadata.title).toBe("Only Title");
        expect(result.metadata.description).toBe("");
        expect(result.metadata.language).toBe("");
        expect(result.metadata.tags).toEqual([]);
        expect(result.code).toBe("const x = 1;\n");
    });

    test("should throw error for invalid format", () => {
        const testContent = `No metadata markers here
Just code without proper formatting
`;

        expect(() => parseMetadata(testContent)).toThrow("Invalid file format");
    });

    test("createFileWithMetadata should create properly formatted file", () => {
        const title = "Generated Title";
        const description = "Generated description for testing purposes";
        const language = "python";
        const tags = ["generate", "test", "create", "metadata", "format"];
        const code = "print('Hello World')";

        const result = createFileWithMetadata(title, description, language, tags, code);

        expect(result).toContain("Title: Generated Title");
        expect(result).toContain("Description: Generated description");
        expect(result).toContain("Language: python");
        expect(result).toContain("Tags: generate, test, create, metadata, format");
        expect(result).toContain("print('Hello World')");
        expect(result).toContain("---METADATA---");
        expect(result).toContain("---CODE---");
    });

    test("should correctly parse multiline content", () => {
        const testContent = `---METADATA---
Title: Multiline Test
Description: This is a multiline description
that spans multiple lines
with different indentation
   and should be preserved correctly
without including the following Language or Tags.
Language: python
Tags: multiline, test, parsing, description, metadata
---CODE---
def main():
    print("Hello, world!")
    
if __name__ == "__main__":
    main()
`;

        const result = parseMetadata(testContent);
        expect(result.metadata.title).toBe("Multiline Test");
        expect(result.metadata.description).toBe(
            "This is a multiline description\nthat spans multiple lines\nwith different indentation\n   and should be preserved correctly\nwithout including the following Language or Tags."
        );
        expect(result.metadata.language).toBe("python");
        expect(result.metadata.tags).toEqual(["multiline", "test", "parsing", "description", "metadata"]);
        expect(result.code).toContain("def main():");
    });

    test("should handle complex content with comments and blank lines", () => {
        const testContent = `---METADATA---
# Comments and instructions
# should be ignored

Title: Complex   Example  
# Another comment
Description: This is a complex
description with blank lines

and comments
# This should be part of description
with special characters: !@#$%^&*()

Language: javascript
# Comment between fields
Tags: complex, edge-case, parsing, metadata, test
---CODE---
function complexTest() {
    console.log("Testing complex parsing");
    // Comments in code
    return {
        status: "ok"
    };
}
`;

        const result = parseMetadata(testContent);
        expect(result.metadata.title).toBe("Complex   Example");
        expect(result.metadata.description).toBe(
            "This is a complex\ndescription with blank lines\n\nand comments\n# This should be part of description\nwith special characters: !@#$%^&*()"
        );
        expect(result.metadata.language).toBe("javascript");
        expect(result.metadata.tags).toEqual(["complex", "edge-case", "parsing", "metadata", "test"]);
        expect(result.code).toContain("function complexTest()");
    });
}); 