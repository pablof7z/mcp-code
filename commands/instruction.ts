import { Command } from 'commander';
import inquirer from 'inquirer';
import {
  findInstructions as findInstructionsLogic,
  getInstruction as getInstructionLogic,
  publishInstruction
} from '../logic/instruction.js';

/**
 * Register the instruction commands
 * @param program The Commander program
 */
export function registerInstructionCommand(program: Command) {
  const instructionCommand = program
    .command('instructions')
    .description('Manage Nostr instructions');

  // instructions find <query>
  instructionCommand
    .command('find')
    .description('Find instructions matching a query')
    .argument('<query>', 'Search query')
    .option('--out <path>', 'Path to save the instruction file')
    .action(async (query, options) => {
      try {
        const result = await findInstructionsLogic({ query });
        
        if (!result.metadata?.instructions || result.metadata.instructions.length === 0) {
          if (result.content && result.content[0]) {
            console.log(result.content[0].text);
          }
          return;
        }
        
        // Display the formatted text result
        if (result.content && result.content[0]) {
          console.log(result.content[0].text);
        }
        
        // Prompt user to select an instruction
        const { instructionIndex } = await inquirer.prompt([
          {
            type: 'number',
            name: 'instructionIndex',
            message: 'Enter the number of the instruction to save:',
            validate: (input) => {
              const num = parseInt(String(input));
              return (num > 0 && num <= result.metadata!.instructions.length) ?
                true :
                `Please enter a number between 1 and ${result.metadata!.instructions.length}`;
            }
          }
        ]);
        
        const selectedInstruction = result.metadata?.instructions?.[instructionIndex - 1];
        
        if (selectedInstruction) {
          // Get the instruction content
          const contentResult = await getInstructionLogic({
            eventId: selectedInstruction.id
          });
          
          if (!contentResult.content?.[0]?.text) {
            throw new Error('No content found for selected instruction');
          }
          
          // Determine output path
          let outputPath = options.out;
          if (!outputPath) {
            const defaultPath = `.roo/rules/${selectedInstruction.title?.replace(/[^a-z0-9]/gi, '_')}.md` || 'instruction.md';
            const { path } = await inquirer.prompt([
              {
                type: 'input',
                name: 'path',
                message: 'Where would you like to save the instruction?',
                default: defaultPath
              }
            ]);
            outputPath = path;
          }
          
          // Handle different path scenarios
          const fs = require('fs');
          const path = require('path');
          
          if (fs.existsSync(outputPath)) {
            if (fs.statSync(outputPath).isDirectory()) {
              // If path is a directory, use instruction title as filename
              const filename = selectedInstruction.title?.replace(/[^a-z0-9]/gi, '_') + '.md' || 'instruction.md';
              outputPath = path.join(outputPath, filename);
            } else {
              // If path is a file, confirm overwrite
              const { overwrite } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'overwrite',
                  message: `File ${outputPath} already exists. Overwrite?`,
                  default: false
                }
              ]);
              if (!overwrite) {
                console.log('Operation cancelled');
                return;
              }
            }
          }
          
          // Ensure directory exists
          const dir = path.dirname(outputPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Write the file
          fs.writeFileSync(outputPath, contentResult.content[0].text);
          console.log(`Instruction saved to: ${outputPath}`);
        }
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    });
  

  // instructions publish <file>
  instructionCommand
    .command('publish')
    .description('Publish a file as an instruction event')
    .argument('<file>', 'Path to the instruction file')
    .action(async (filePath) => {
      try {
        // Prompt for instruction metadata
        const { title, description, tags } = await inquirer.prompt([
          {
            type: 'input',
            name: 'title',
            message: 'Enter a title for the instruction:',
            validate: (input) => !!input || 'Title is required'
          },
          {
            type: 'input',
            name: 'description',
            message: 'Enter a description for the instruction:',
            validate: (input) => !!input || 'Description is required'
          },
          {
            type: 'input',
            name: 'tags',
            message: 'Enter comma-separated tags for the instruction:',
            filter: (input: string) => input.split(',').map((tag: string) => tag.trim())
          }
        ]);

        // Publish the instruction
        const result = await publishInstruction({
          filePath,
          title,
          description,
          tags
        });
        
        if (result.content && result.content[0]) {
          console.log(result.content[0].text);
        }
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    });
}