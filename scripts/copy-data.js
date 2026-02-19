const fs = require('fs');
const path = require('path');

// Paths - try multiple locations for source file
const possibleSources = [
  path.join(__dirname, '..', 'data', 'prospects.json'),  // In-repo: digitalwiz-crm/data/prospects.json
  path.join(__dirname, '..', '..', 'crm-data', 'prospects.json'),  // Workspace: ../crm-data/prospects.json
];

const sourceFile = possibleSources.find(p => fs.existsSync(p)) || possibleSources[0];
const destDir = path.join(__dirname, '..', 'public', 'data');
const destFile = path.join(destDir, 'prospects.json');

console.log('📦 Copying CRM data for build...');
console.log(`   Source: ${sourceFile}`);
console.log(`   Destination: ${destFile}`);

try {
  // Create public/data directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log('✅ Created public/data directory');
  }

  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.warn('⚠️  Warning: Source file not found. Creating empty prospects.json...');
    const emptyData = {
      deals: [],
      retainers: [],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(destFile, JSON.stringify(emptyData, null, 2));
    console.log('✅ Created empty prospects.json (graceful fallback)');
  } else {
    // Copy the file
    fs.copyFileSync(sourceFile, destFile);
    console.log('✅ CRM data copied successfully');
    
    // Validate JSON
    const data = JSON.parse(fs.readFileSync(destFile, 'utf8'));
    console.log(`   📊 Loaded ${data.deals?.length || 0} deals, ${data.retainers?.length || 0} retainers`);
  }
} catch (error) {
  console.error('❌ Error copying CRM data:', error.message);
  // Create fallback empty file so build doesn't fail
  const emptyData = {
    deals: [],
    retainers: [],
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(destFile, JSON.stringify(emptyData, null, 2));
  console.log('✅ Created empty prospects.json as fallback');
}
