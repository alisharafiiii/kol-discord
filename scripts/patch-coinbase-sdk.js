const fs = require('fs');
const path = require('path');

console.log('🔧 Patching Coinbase SDK HeartbeatWorker...');

const workerPaths = [
  'node_modules/@coinbase/wallet-sdk/dist/sign/walletlink/relay/connection/HeartbeatWorker.js',
  'node_modules/.pnpm/@coinbase+wallet-sdk@4.3.3/node_modules/@coinbase/wallet-sdk/dist/sign/walletlink/relay/connection/HeartbeatWorker.js'
];

for (const workerPath of workerPaths) {
  const fullPath = path.join(process.cwd(), workerPath);
  
  if (fs.existsSync(fullPath)) {
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remove the problematic export statement
      content = content.replace(/export\s*{\s*}\s*;?/g, '');
      content = content.replace(/export\s*{}\s*;?/g, '');
      
      // Write back the patched file
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Patched: ${workerPath}`);
    } catch (err) {
      console.error(`❌ Failed to patch: ${workerPath}`, err);
    }
  }
}

console.log('✅ Coinbase SDK patch complete'); 