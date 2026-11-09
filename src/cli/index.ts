import { type CliContext } from '@agentage/extension';

// One handler per command in agentage.commands: `agentage ping [msg]`.
export function create({ out, args }: CliContext) {
  return {
    ping: () => out.log(args.msg ? `pong ${args.msg}` : 'pong'),
  };
}
