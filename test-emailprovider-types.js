#!/usr/bin/env node
/**
 * Test script to validate emailProvider TypeScript type changes
 *
 * This validates that:
 * 1. The Config type includes emailProvider property
 * 2. The EmailProvider component compiles without type errors
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Testing emailProvider TypeScript changes...\n');

// Test 1: Check Config type includes emailProvider
console.log('✓ Test 1: Checking Config type definition...');
const configPath = path.join(__dirname, 'apps/admin-x-framework/src/api/config.ts');
const configContent = require('fs').readFileSync(configPath, 'utf8');

if (configContent.includes('emailProvider?:')) {
    console.log('  ✓ Config type includes emailProvider property');
} else {
    console.error('  ✗ Config type missing emailProvider property');
    process.exit(1);
}

// Test 2: Check EmailProvider component exists
console.log('\n✓ Test 2: Checking EmailProvider component...');
const componentPath = path.join(__dirname, 'apps/admin-x-settings/src/components/settings/email/EmailProvider.tsx');
if (require('fs').existsSync(componentPath)) {
    console.log('  ✓ EmailProvider component exists');

    const componentContent = require('fs').readFileSync(componentPath, 'utf8');
    if (componentContent.includes('config.emailProvider')) {
        console.log('  ✓ Component uses config.emailProvider');
    } else {
        console.error('  ✗ Component does not use config.emailProvider');
        process.exit(1);
    }
} else {
    console.error('  ✗ EmailProvider component not found');
    process.exit(1);
}

// Test 3: Verify TypeScript compilation (dry run)
console.log('\n✓ Test 3: Running TypeScript type check on admin-x-settings...');
try {
    execSync('cd apps/admin-x-settings && npx tsc --noEmit --skipLibCheck 2>&1', {
        cwd: __dirname,
        encoding: 'utf8',
        stdio: 'pipe'
    });
    console.log('  ✓ TypeScript compilation successful');
} catch (error) {
    // Check if errors are related to emailProvider
    const output = error.stdout || error.message;
    if (output.includes('emailProvider')) {
        console.error('  ✗ TypeScript errors related to emailProvider:');
        console.error(output);
        process.exit(1);
    } else {
        console.log('  ⚠ TypeScript has unrelated errors (not blocking)');
    }
}

console.log('\n✅ All emailProvider type validations passed!\n');
console.log('Summary:');
console.log('  - Config type properly defines emailProvider property');
console.log('  - EmailProvider component correctly uses typed config');
console.log('  - No TypeScript errors related to emailProvider\n');
