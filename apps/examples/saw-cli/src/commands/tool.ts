import { Command } from 'commander';
import { getWalletTools, getCurrentWalletName, createWalletFromName } from '../wallet/manager.js';

export const toolCommand = new Command('tool')
  .description('Tool management and execution')
  .passThroughOptions();

toolCommand
  .command('list')
  .description('List all available tools from enabled plugins')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const tools = getWalletTools();

    if (options.json) {
      console.log(JSON.stringify({ tools }));
      return;
    }

    console.log('\n┌┬┐');
    console.log('│ Tool                    │ Description                            │');
    console.log('├┼┤');

    if (tools.length === 0) {
      console.log('│ No tools available. Load a wallet first.               │');
    } else {
      for (const tool of tools) {
        const name = tool.name.padEnd(24);
        const desc = tool.description.slice(0, 38).padEnd(38);
        console.log(`│ ${name} │ ${desc} │`);
      }
    }
    console.log('└┴┘');
    console.log('\nUse "agent-wallet tool show <tool-name>" to see input schema');
  });

toolCommand
  .command('show <tool-name>')
  .description('Show input schema for a tool')
  .action((toolName: string) => {
    const tools = getWalletTools();
    const tool = tools.find(t => t.name === toolName);

    if (!tool) {
      console.error(`Tool "${toolName}" not found. Run "agent-wallet tool list" to see available tools.`);
      process.exit(1);
    }

    console.log(`\nTool: ${tool.name}`);
    console.log(`Description: ${tool.description}`);
    console.log('\nInput Schema:');
    console.log(JSON.stringify(tool.inputSchema, null, 2));
  });

toolCommand
  .command('run <tool> [input...]')
  .description('Execute a tool')
  .option('--wallet <name>', 'Wallet name to use')
  .action(async (toolName: string, inputArgs: string[], options) => {
    const walletName = options.wallet || getCurrentWalletName();
    if (!walletName) {
      console.error('Error: No wallet selected. Use --wallet or run "agent-wallet select <name>" first.');
      process.exit(1);
    }

    const wallet = createWalletFromName(walletName);
    if (!wallet) {
      console.error(`Error: Failed to load wallet "${walletName}"`);
      process.exit(1);
    }

    const tool = wallet.getTools().find(t => t.name === toolName);
    if (!tool) {
      console.error(`Error: Tool "${toolName}" not found. Run "agent-wallet tool list" to see available tools.`);
      process.exit(1);
    }

    try {
      let input: Record<string, unknown> = {};

      if (inputArgs.length > 0) {
        const inputStr = inputArgs.join(' ');
        try {
          input = JSON.parse(inputStr);
        } catch {
          console.error('Error: Invalid JSON input. Pass JSON as a single argument or use --json flag.');
          process.exit(1);
        }
      }

      const result = await tool.execute(input);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error executing tool:', error);
      process.exit(1);
    }
  });

export { toolCommand as toolCommandObject };
