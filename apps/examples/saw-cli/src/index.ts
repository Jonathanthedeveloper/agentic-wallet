#!/usr/bin/env bun

import { Command } from 'commander';

import { initCommand } from './commands/init.js';
import { createCommand } from './commands/create.js';
import { listCommand } from './commands/list.js';
import { selectCommand } from './commands/select.js';
import { deleteCommand } from './commands/delete.js';
import { balanceCommand } from './commands/balance.js';
import { addressCommand } from './commands/address.js';
import { transferCommand } from './commands/transfer.js';
import { airdropCommand } from './commands/airdrop.js';
import { toolCommand } from './commands/tool.js';
import { serveCommand } from './commands/serve.js';
import { adminCommand } from './commands/admin.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('agent-wallet')
  .description('CLI for AI agentic wallets on Solana')
  .version('1.0.0')
  .enablePositionalOptions()
  .option('--config <path>', 'Path to config file')
  .option('--wallet <name>', 'Use specific wallet')
  .option('--network <cluster>', 'Solana cluster: mainnet, devnet, testnet', 'devnet')
  .option('--json', 'Output in JSON format')
  .option('--verbose', 'Enable verbose logging');

program.addCommand(initCommand);
program.addCommand(createCommand);
program.addCommand(listCommand);
program.addCommand(selectCommand);
program.addCommand(deleteCommand);
program.addCommand(balanceCommand);
program.addCommand(addressCommand);
program.addCommand(transferCommand);
program.addCommand(airdropCommand);
program.addCommand(toolCommand);
program.addCommand(serveCommand);
program.addCommand(adminCommand);
program.addCommand(configCommand);

program.parse();
