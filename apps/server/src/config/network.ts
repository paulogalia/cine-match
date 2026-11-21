import os from 'node:os';
import type { NetworkInfoResponse, NetworkInterfaceInfo } from '@cine-match/shared';

const VIRTUAL_INTERFACE_PATTERN =
  /docker|veth|br-|vbox|vmware|wsl|hyper-v|vethernet|tailscale|zerotier|utun|tun|tap|loopback/i;

function getAddressPriority(address: string): number {
  if (address.startsWith('192.168.')) return 1;
  if (address.startsWith('10.')) return 2;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) return 3;
  return 4;
}

export function getLocalNetworkInfo(port: number): NetworkInfoResponse {
  const interfaces = os.networkInterfaces();
  const candidates: NetworkInterfaceInfo[] = [];

  for (const [interfaceName, entries] of Object.entries(interfaces)) {
    if (!entries || VIRTUAL_INTERFACE_PATTERN.test(interfaceName)) {
      continue;
    }

    for (const entry of entries) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      if (entry.address.startsWith('169.254.')) continue;

      candidates.push({
        interfaceName,
        address: entry.address,
        url: `http://${entry.address}:${port}`,
        recommended: false,
      });
    }
  }

  candidates.sort((a, b) => getAddressPriority(a.address) - getAddressPriority(b.address));

  if (candidates[0]) {
    candidates[0].recommended = true;
  }

  const primaryUrl = candidates[0]?.url ?? `http://localhost:${port}`;

  return {
    port,
    primaryUrl,
    candidates,
    hostname: os.hostname(),
  };
}
