import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

const BLOCKED_RANGES = [
  '127.0.0.0/8',    // Localhost
  '10.0.0.0/8',     // Private A
  '172.16.0.0/12',  // Private B
  '192.168.0.0/16', // Private C
  '169.254.0.0/16', // Link-local
  '::1/128',        // IPv6 Localhost
  'fc00::/7',       // IPv6 Unique Local
  'fe80::/10'       // IPv6 Link-local
];

export async function validateURL(url: string): Promise<void> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    throw new Error('INVALID_URL');
  }

  // Chặn 0.0.0.0 hoặc localhost ngay từ hostname
  if (['localhost', '0.0.0.0', '::1'].includes(parsedUrl.hostname)) {
    throw new Error('BLOCKED_IP');
  }

  // Resolve DNS để lấy IP thật
  let addresses: string[] = [];
  try {
    const result = await dns.lookup(parsedUrl.hostname, { all: true });
    addresses = result.map(r => r.address);
  } catch (e) {
    throw new Error('DNS_RESOLUTION_FAILED');
  }

  for (const ip of addresses) {
    const parsedIp = ipaddr.parse(ip);
    
    // Check range
    for (const range of BLOCKED_RANGES) {
      const [rangeIp, prefix] = range.split('/');
      // @ts-ignore - ipaddr types mismatch slightly but logic works
      if (parsedIp.match(ipaddr.parse(rangeIp), parseInt(prefix))) {
        throw new Error('BLOCKED_IP');
      }
    }
    
    // Check if IPv4 mapped (::ffff:127.0.0.1)
    if (parsedIp.kind() === 'ipv6' && (parsedIp as ipaddr.IPv6).isIPv4MappedAddress()) {
        const ipv4 = (parsedIp as ipaddr.IPv6).toIPv4Address();
        for (const range of BLOCKED_RANGES) {
             if(range.includes('.')) { // Only check IPv4 ranges
                 const [rangeIp, prefix] = range.split('/');
                 // @ts-ignore
                 if (ipv4.match(ipaddr.parse(rangeIp), parseInt(prefix))) {
                     throw new Error('BLOCKED_IP');
                 }
             }
        }
    }
  }
}