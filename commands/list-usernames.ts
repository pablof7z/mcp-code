import { Command } from 'commander';
import { listUsernames } from '../logic/list_usernames.js';

export function registerListUsernamesCommand(program: Command): void {
    program
        .command('list-usernames')
        .description('List all usernames in the database')
        .action(async () => {
            try {
                const result = await listUsernames();

                // Extract text content from the response
                if (result.content && result.content.length > 0) {
                    const textContent = result.content.find(item => item.type === 'text');
                    if (textContent) {
                        console.log(textContent.text);
                    }
                }
            } catch (error) {
                console.error("Error executing list-usernames command:", error);
                process.exit(1);
            }
        });
} 