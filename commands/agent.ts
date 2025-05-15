import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import {
  findAgents as findAgentsLogic,
  getAgent as getAgentLogic,
  publishAgent
} from '../logic/agent.js';

/**
 * Register the agent commands
 * @param program The Commander program
 */
export function registerAgentCommand(program: Command) {
  const agentCommand = program
    .command('agent')
    .description('Manage Roo agents');
  
  // agent find <query>
  agentCommand
    .command('find')
    .description('Find agents matching a query')
    .argument('<query>', 'Search query')
    .action(async (query) => {
      try {
        const result = await findAgentsLogic({ query });
        
        // Display the formatted text result
        if (result.content && result.content[0]) {
          console.log(result.content[0].text);
        }
        
        if (result.metadata?.agents && result.metadata.agents.length > 0) {
          // Prompt user to select an agent to install
          const { install } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'install',
              message: 'Would you like to install one of these agents?',
              default: false
            }
          ]);
          
          if (install) {
            const { agentIndex } = await inquirer.prompt([
              {
                type: 'number',
                name: 'agentIndex',
                message: 'Enter the number of the agent to install:',
                validate: (input) => {
                  const num = parseInt(String(input));
                  return (num > 0 && num <= result.metadata!.agents.length) ? 
                    true : 
                    `Please enter a number between 1 and ${result.metadata!.agents.length}`;
                }
              }
            ]);
            
            const selectedAgent = result.metadata?.agents?.[agentIndex - 1];
            
            if (selectedAgent) {
              // Prompt for --roo flag
              const { roomodesPath } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'roomodesPath',
                  message: 'Enter path to .roomodes file (leave empty for $PWD/.roomodes):',
                  default: path.join(process.cwd(), '.roomodes')
                }
              ]);
              
              // Get and save the agent
              const saveResult = await getAgentLogic({
                eventId: selectedAgent.id,
                roomodesPath
              });
              
              if (saveResult.content && saveResult.content[0]) {
                console.log(saveResult.content[0].text);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    });
  
  // agent get <eventid> --roo <path>
  agentCommand
    .command('get')
    .description('Get and install an agent by event ID')
    .argument('<eventid>', 'Nostr event ID')
    .requiredOption('--roo [path]', 'Path to .roomodes file (default: $PWD/.roomodes)')
    .action(async (eventId, options) => {
      try {
        // Determine .roomodes path
        const roomodesPath = options.roo === true ? 
          path.join(process.cwd(), '.roomodes') : 
          options.roo;
        
        // Get and save the agent
        const result = await getAgentLogic({
          eventId,
          roomodesPath
        });
        
        if (result.content && result.content[0]) {
          console.log(result.content[0].text);
        }
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    });
  // agent publish <path>
  agentCommand
    .command('publish')
    .description('Publish an agent from a .roomodes file to Nostr')
    .argument('<path>', 'Path to .roomodes file')
    .action(async (roomodesPath) => {
      try {
        const result = await publishAgent({ roomodesPath });
        
        if (result.content && result.content[0]) {
          console.log(result.content[0].text);
        }
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    });
}