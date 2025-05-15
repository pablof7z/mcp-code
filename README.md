# tenex-tools

Share, discover, and integrate LLM coding instructions & code snippets to supercharge your AI coding agents.

## 🚀 Overview

As AI-powered coding assistants become a staple in development workflows, the key to unlocking their full potential is guiding them with precise, battle-tested instructions and code recipes. **tenex-tools** provides a collaborative registry and CLI for publishing, finding, and integrating:

- **Micro-Instructions**: Turn common coding tasks into LLM-friendly step-by-step guides.  
- **Code Snippets**: Share reusable code patterns that dramatically reduce errors and improve quality.  
- **Agent Profiles**: Define custom agent personas and workflows to automate complex tasks.  

By tapping into a community-driven marketplace of LLM assets, you can radically improve the performance, reliability, and consistency of your AI coding agents.

---

## ⭐ Key Benefits

- **Accelerate Agent Accuracy**: Snippets and instructions sharpen an LLM’s focus on your coding conventions and best practices.  
- **Collaborative Growth**: Publish your own assets, build your reputation, and leverage community contributions.  
- **Plug & Play**: Seamlessly integrate with any MCP-compatible agent or workflow.  
- **Search & Discover**: Find the exact snippet or workflow you need with rich filtering by tags, languages, and authors.  

---

## 🔧 Features

- **Publish & Retrieve Instructions**  
  `tenex-tools instructions find <query>`  
  `tenex-tools instructions publish <file>`
- **Search & Fetch Code Snippets**  
  `tenex-tools find-snippets [--limit <n>] [--languages <list>] [--tags <list>] [--authors <list>]`
- **Manage Custom Agent Profiles**  
  `tenex-tools agent find <query>`  
  `tenex-tools agent get <eventId> --roo [path]`  
  `tenex-tools agent publish <.roomodes path>`
- **One-time Setup Wizard**  
  `tenex-tools setup`
- **Advanced MCP Mode**
  `tenex-tools mcp`

---


## 💡 Use Cases

- Generate robust unit tests with curated TDD snippets  
- Automate refactoring workflows with step-by-step instructions  
- Create domain-specific agent personas (e.g., Security Auditor, Performance Tuner)  
- Share best practices across teams and projects  

---

## 🚀 Getting Started

1. **Install tenex-tools**
   ```bash
   bun install
   ```

   > **Note:** If you want to use tenex-tools globally, you can link it after building:
   > ```bash
   > bun run build
   > bun link
   > ```

2. **Run the setup wizard**
   ```bash
   bun run index.ts setup
   ```

### **Find and install a code snippet**  
   ```bash
   tenex-tools find-snippets --limit 5 --languages javascript,python --tags testing
   ```

### **Discover agent workflows**  
   ```bash
   tenex-tools agent find "refactor"
   ```

### **Fetch and save an instruction set**  
   ```bash
   tenex-tools instructions find "optimize imports" --out .roo/rules-code/
   ```

---

## 📖 CLI Reference

**Setup**  
```bash
tenex-tools setup
```  

**Find Snippets**  
```bash
tenex-tools find-snippets [--limit <n>] [--languages <list>] [--tags <list>] [--authors <list>]
```  

**Instructions**  
```bash
tenex-tools instructions find <query> [--out <path>]
tenex-tools instructions publish <file>
```  

**Agents**  
```bash
tenex-tools agent find <query>
tenex-tools agent get <eventId> --roo [path]
tenex-tools agent publish <.roomodes path>
```  

---

## 🤝 Contributing

We welcome new snippets, instructions, and agent profiles! To contribute:

1. Fork this repo and clone.  
2. Add your assets under `assets/`, or publish directly with the CLI.  
3. Submit a PR or share your contributions via the community registry.  

---

## 📜 License

MIT
