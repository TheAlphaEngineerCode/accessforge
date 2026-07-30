#!/usr/bin/env node
/**
 * `accessforge` CLI entrypoint.
 *
 * Phase 0 ships a `doctor` subcommand and a generic `help`. The full surface
 * (`scan`, `journeys run`, `issues list`, `baseline` …) is wired from Phase 2+
 * when the browser engine exists and the platform has a typed client to talk to.
 */
import { ALL_EVENT_TYPES } from '@accessforge/domain';

const VERSION = '0.0.0-phase-0';

interface ParsedArgs {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly flags: ReadonlyMap<string, string>;
}

function parseArgs(argv: ReadonlyArray<string>): ParsedArgs {
  const flags = new Map<string, string>();
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags.set(arg.slice(2), next);
        i++;
      } else {
        flags.set(arg.slice(2), '');
      }
    } else {
      positional.push(arg);
    }
  }
  return { command: positional[0] ?? 'help', args: positional.slice(1), flags };
}

const HELP = `
AccessForge CLI v${VERSION}

Commands available at Phase 0:
  help                Show this help
  version             Print the CLI version
  doctor              Print a basic environment/health probe
  status              Placeholder — implemented with the scan engine

Future commands:
  login, status, projects list, scan <url>, scans list, issues list,
  journeys list, journeys run, baseline create, baseline compare, report
`;

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  switch (parsed.command) {
    case 'help':
    case '--help':
    case '-h':
      console.info(HELP);
      break;
    case 'version':
    case '--version':
    case '-v':
      console.info(VERSION);
      break;
    case 'doctor':
      console.info(
        JSON.stringify(
          {
            node: process.versions.node,
            platform: process.platform,
            arch: process.arch,
            uptimeSeconds: process.uptime(),
            envNodeEnv: process.env.NODE_ENV ?? '(unset)',
            handledEventTypes: ALL_EVENT_TYPES.length,
          },
          null,
          2,
        ),
      );
      break;
    case 'status':
      console.error(
        '[accessforge] status: not implemented in Phase 0 — see IMPLEMENTATION_STATUS.md',
      );
      process.exitCode = 1;
      break;
    default:
      console.error(`[accessforge] unknown command: ${parsed.command}\n${HELP}`);
      process.exitCode = 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
