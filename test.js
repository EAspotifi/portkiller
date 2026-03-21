const lines = [
  "tcp LISTEN 0 511 [::1]:5173 [::]:* users:()",
  "tcp LISTEN 0 4096 127.0.0.1:38585 0.0.0.0:* users:((\\"language_server\\",pid=7118,fd=10))",
  "tcp LISTEN 0 50 *:1716 *:* users:((\\"kdeconnectd\\",pid=3998,fd=27))"
];

for (const line of lines) {
  const match1 = line.match(/(?:[\\d.*\\[\\]%:\\w]+):(\\d+)\\s+(?:[\\d.*\\[\\]%:\\w]+):[*\\d]/);
  const match2 = line.match(/(\\S+):(\\d+)\\s+(?:\\S+):[*\\d]+/);
  // Actually, we want something simple:
  // look for LocalAddress:Port. It's the 5th column or 4th column.
  // We can just split by space and look for the item before the one ending in :* or :\d+
  const parts = line.trim().split(/\\s+/);
  let port = null;
  // Usually parts[4] is local address, parts[5] is peer address
  // So parts[4] is IP:PORT
  const localAddr = parts[4];
  const lastColonIndex = localAddr.lastIndexOf(':');
  if (lastColonIndex > 0) {
     port = localAddr.substring(lastColonIndex + 1);
  }
  
  console.log({ line: line.substring(0, 30), match1: match1 ? match1[1] : null, match2: match2 ? match2[2] : null, port });
}
