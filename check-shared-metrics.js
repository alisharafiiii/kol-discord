// Quick test script to check shared metrics data
async function checkSharedMetrics() {
  const shareId = 'WKelSfGNbtwzl8pNgalE';
  const response = await fetch(`http://localhost:3001/api/metrics/shared?shareId=${shareId}`);
  const data = await response.json();
  console.log('Full response:', JSON.stringify(data, null, 2));
  console.log('Number of entries:', data.entries?.length);
  console.log('First entry structure:', data.entries?.[0]);
}

checkSharedMetrics();
