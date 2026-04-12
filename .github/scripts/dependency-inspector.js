#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const jsonc = require('jsonc-parser');
const { execSync } = require('child_process');

/**
 * Parse pnpm outdated --json output into an array of
 * [packageName, current, wanted, latest, dependencyType] tuples.
 *
 * pnpm's JSON output is an object keyed by package name:
 *   { "pkg": { "wanted": "1.0.1", "latest": "2.0.0", "dependencyType": "dependencies" } }
 *
 * pnpm's JSON output does not include a "current" field — "wanted"
 * represents the lockfile-resolved version, so we use it as current.
 */
function parsePnpmOutdatedOutput(stdout) {
  if (!stdout || !stdout.trim()) {
    return [];
  }

  const data = JSON.parse(stdout);
  return Object.entries(data).map(([name, info]) => [
    name,
    info.wanted,
    info.wanted,
    info.latest,
    info.dependencyType
  ]);
}

/**
 * Smart lockfile drift detector that focuses on actionable updates
 * and avoids API rate limits by using pnpm's built-in commands where possible
 */

class LockfileDriftDetector {
  constructor() {
    this.workspaces = [];
    this.directDeps = new Map();
    this.outdatedInfo = [];
    this.workspaceStats = new Map();
    this.workspaceDepsCount = new Map();
    this.ignoredWorkspaceDeps = new Set();
    this.renovateIgnoredDeps = new Set();

    // Parse command line arguments
    this.args = process.argv.slice(2);
    this.filterSeverity = null;

    // Check for severity filters
    if (this.args.includes('--patch')) {
      this.filterSeverity = 'patch';
    } else if (this.args.includes('--minor')) {
      this.filterSeverity = 'minor';
    } else if (this.args.includes('--major')) {
      this.filterSeverity = 'major';
    }

    // Check for help flag
    if (this.args.includes('--help') || this.args.includes('-h')) {
      this.showHelp();
      process.exit(0);
    }
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log(`
Dependency Inspector - Smart lockfile drift detector

Usage: dependency-inspector.js [options]

Options:
  --patch      Show all packages with patch updates
  --minor      Show all packages with minor updates
  --major      Show all packages with major updates
  --help, -h   Show this help message

Without flags, shows high-priority updates sorted by impact.
With a severity flag, shows all packages with that update type.
`);
  }

  /**
   * Load ignored dependencies from renovate configuration
   */
  loadRenovateConfig() {
    console.log('🔧 Loading renovate configuration...');

    try {
      // Read renovate.json from project root (two levels up from .github/scripts/)
      const renovateConfigPath = path.join(__dirname, '../../.github/renovate.json5');
      const renovateConfig = jsonc.parse(fs.readFileSync(renovateConfigPath, 'utf8'));

      if (renovateConfig.ignoreDeps) {
        for (const dep of renovateConfig.ignoreDeps) {
          this.renovateIgnoredDeps.add(dep);
        }
        console.log(`📝 Loaded ${renovateConfig.ignoreDeps.length} ignored dependencies from renovate.json`);
        console.log(`   Ignored: ${Array.from(this.renovateIgnoredDeps).join(', ')}`);
      } else {
        console.log('📝 No ignoreDeps found in renovate.json');
      }
    } catch (error) {
      console.warn('⚠️  Could not load renovate.json:', error.message);
    }
  }

  /**
   * Get all workspace package.json files
   */
  async findWorkspaces() {
    // Read from project root (two levels up from .github/scripts/)
    const rootDir = path.join(__dirname, '../..');
    const rootPackage = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

    // Read workspace patterns from pnpm-workspace.yaml (primary) or package.json (fallback)
    let workspacePatterns = [];
    const pnpmWorkspacePath = path.join(rootDir, 'pnpm-workspace.yaml');
    if (fs.existsSync(pnpmWorkspacePath)) {
      const content = fs.readFileSync(pnpmWorkspacePath, 'utf8');
      let inPackages = false;
      for (const line of content.split('\n')) {
        if (/^packages:/.test(line)) {
          inPackages = true;
          continue;
        }
        if (inPackages) {
          const match = line.match(/^\s+-\s+['"]?([^'"]+)['"]?\s*$/);
          if (match) {
            workspacePatterns.push(match[1]);
          } else if (/^\S/.test(line)) {
            break;
          }
        }
      }
    } else {
      workspacePatterns = rootPackage.workspaces || [];
    }

    console.log('📦 Scanning workspaces...');

    // Add root package
    this.workspaces.push({
      name: rootPackage.name || 'root',
      path: '.',
      packageJson: rootPackage
    });

    // Find workspace packages
    for (const pattern of workspacePatterns) {
              const globPattern = path.join(rootDir, pattern.replace(/\*$/, ''));
        try {
          const dirs = fs.readdirSync(globPattern, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => path.join(globPattern, dirent.name));

          for (const dir of dirs) {
            const packageJsonPath = path.join(dir, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
            try {
              const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

              // Skip ghost/admin directory but track its dependencies for filtering
              if (path.basename(dir) === 'admin' && dir.includes('ghost')) {
                console.log(`🚫 Ignoring ghost/admin workspace (tracking deps for filtering)`);
                const deps = {
                  ...packageJson.dependencies,
                  ...packageJson.devDependencies,
                  ...packageJson.peerDependencies,
                  ...packageJson.optionalDependencies
                };
                // Add all ghost/admin dependencies to ignore list
                for (const depName of Object.keys(deps || {})) {
                  this.ignoredWorkspaceDeps.add(depName);
                }
                continue;
              }

              this.workspaces.push({
                name: packageJson.name || path.basename(dir),
                path: dir,
                packageJson
              });
            } catch (e) {
              console.warn(`⚠️  Skipped ${packageJsonPath}: ${e.message}`);
            }
          }
        }
      } catch (e) {
        console.warn(`⚠️  Skipped pattern ${pattern}: ${e.message}`);
      }
    }

    console.log(`Found ${this.workspaces.length} workspaces`);
    return this.workspaces;
  }

    /**
   * Extract all direct dependencies from workspaces
   */
  extractDirectDependencies() {
    console.log('🔍 Extracting direct dependencies...');

    for (const workspace of this.workspaces) {
      const { packageJson } = workspace;
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
        ...packageJson.optionalDependencies
      };

      // Count total dependencies for this workspace
      const totalDepsForWorkspace = Object.keys(deps || {}).length;
      this.workspaceDepsCount.set(workspace.name, totalDepsForWorkspace);

      for (const [name, range] of Object.entries(deps || {})) {
        if (!this.directDeps.has(name)) {
          this.directDeps.set(name, new Set());
        }
        this.directDeps.get(name).add({
          workspace: workspace.name,
          range,
          path: workspace.path
        });
      }
    }

    return this.directDeps;
  }

  /**
   * Use pnpm outdated to get comprehensive outdated info
   * This is much faster and more reliable than manual API calls
   */
  async getOutdatedPackages() {
    console.log('🔄 Running pnpm outdated (this may take a moment)...');

    let stdout;
    try {
      stdout = execSync('pnpm outdated --json', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large output
      });
    } catch (error) {
      // pnpm outdated exits with code 1 when there are outdated packages
      if (error.status === 1 && error.stdout) {
        stdout = error.stdout;
      } else {
        console.error('Failed to run pnpm outdated:', error.message);
        return [];
      }
    }

    return parsePnpmOutdatedOutput(stdout);
  }

  /**
   * Analyze the severity of version differences
   */
  analyzeVersionDrift(current, wanted, latest) {
    const parseVersion = (v) => {
      const match = v.match(/(\d+)\.(\d+)\.(\d+)/);
      if (!match) return { major: 0, minor: 0, patch: 0 };
      return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3])
      };
    };

    const currentVer = parseVersion(current);
    const latestVer = parseVersion(latest);

    const majorDiff = latestVer.major - currentVer.major;
    const minorDiff = latestVer.minor - currentVer.minor;
    const patchDiff = latestVer.patch - currentVer.patch;

    let severity = 'patch';
    let score = patchDiff;

    if (majorDiff > 0) {
      severity = 'major';
      score = majorDiff * 1000 + minorDiff * 100 + patchDiff;
    } else if (minorDiff > 0) {
      severity = 'minor';
      score = minorDiff * 100 + patchDiff;
    }

    return { severity, score, majorDiff, minorDiff, patchDiff };
  }

    /**
   * Process and categorize outdated packages
   */
  processOutdatedPackages(outdatedData) {
    console.log('📊 Processing outdated package information...');

    // Initialize workspace stats
    for (const workspace of this.workspaces) {
      this.workspaceStats.set(workspace.name, {
        total: 0,
        major: 0,
        minor: 0,
        patch: 0,
        packages: [],
        outdatedPackageNames: new Set() // Track unique package names per workspace
      });
    }

    const results = {
      direct: [],
      transitive: [],
      stats: {
        total: 0,
        major: 0,
        minor: 0,
        patch: 0
      }
    };

                for (const [packageName, current, wanted, latest, packageType] of outdatedData) {
      const isDirect = this.directDeps.has(packageName);

      // Skip packages that are only used by ignored workspaces (like ghost/admin)
      if (!isDirect && this.ignoredWorkspaceDeps.has(packageName)) {
        continue;
      }

      // Skip packages that are ignored by renovate configuration
      if (this.renovateIgnoredDeps.has(packageName)) {
        continue;
      }

      const analysis = this.analyzeVersionDrift(current, wanted, latest);

      const packageInfo = {
        name: packageName,
        current,
        wanted,
        latest,
        type: packageType || 'dependencies',
        isDirect,
        ...analysis,
        workspaces: isDirect ? Array.from(this.directDeps.get(packageName)) : []
      };

      // Update workspace statistics for direct dependencies
      if (isDirect) {
        for (const workspaceInfo of packageInfo.workspaces) {
          const stats = this.workspaceStats.get(workspaceInfo.workspace);
          if (stats && !stats.outdatedPackageNames.has(packageName)) {
            // Only count each package once per workspace
            stats.outdatedPackageNames.add(packageName);
            stats.total++;
            stats[analysis.severity]++;
            stats.packages.push({
              name: packageName,
              current,
              latest,
              severity: analysis.severity
            });
          }
        }
        results.direct.push(packageInfo);
      } else {
        results.transitive.push(packageInfo);
      }

      results.stats.total++;
      results.stats[analysis.severity]++;
    }

    // Deduplicate direct dependencies and count workspace impact
    const directDepsMap = new Map();
    for (const pkg of results.direct) {
      if (!directDepsMap.has(pkg.name)) {
        directDepsMap.set(pkg.name, {
          ...pkg,
          workspaceCount: pkg.workspaces.length,
          impact: pkg.workspaces.length // Number of workspaces affected
        });
      }
    }

    // Sort by impact: workspace count first, then severity, then score
    const sortByImpact = (a, b) => {
      // First by number of workspaces (more workspaces = higher priority)
      if (a.impact !== b.impact) {
        return b.impact - a.impact;
      }
      // Then by severity
      if (a.severity !== b.severity) {
        const severityOrder = { major: 3, minor: 2, patch: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      // Finally by version drift score
      return b.score - a.score;
    };

    results.direct = Array.from(directDepsMap.values()).sort(sortByImpact);
    results.transitive.sort((a, b) => {
      if (a.severity !== b.severity) {
        const severityOrder = { major: 3, minor: 2, patch: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.score - a.score;
    });

    return results;
  }

  /**
   * Display filtered results by severity
   */
  displayFilteredResults(results) {
    const severityEmoji = {
      major: '🔴',
      minor: '🟡',
      patch: '🟢'
    };

    const emoji = severityEmoji[this.filterSeverity];
    const filterTitle = this.filterSeverity.toUpperCase();

    console.log(`${emoji} ${filterTitle} UPDATES ONLY:\n`);

    // Filter direct dependencies
    const filteredDirect = results.direct.filter(pkg => pkg.severity === this.filterSeverity);
    const filteredTransitive = results.transitive.filter(pkg => pkg.severity === this.filterSeverity);

    console.log(`Found ${filteredDirect.length} direct and ${filteredTransitive.length} transitive ${this.filterSeverity} updates.\n`);

    if (filteredDirect.length > 0) {
      console.log('📦 DIRECT DEPENDENCIES:');
      console.log('─'.repeat(80));

      // Sort by workspace impact, then by package name
      filteredDirect.sort((a, b) => {
        if (a.impact !== b.impact) {
          return b.impact - a.impact;
        }
        return a.name.localeCompare(b.name);
      });

      for (const pkg of filteredDirect) {
        const workspaceList = pkg.workspaces.map(w => w.workspace).join(', ');
        const impactNote = pkg.workspaceCount > 1 ? ` (${pkg.workspaceCount} workspaces)` : '';
        console.log(`   ${emoji} ${pkg.name}: ${pkg.current} → ${pkg.latest}${impactNote}`);
        console.log(`      Workspaces: ${workspaceList}`);
      }

      console.log('\n🚀 UPDATE COMMANDS:');
      console.log('─'.repeat(80));
      for (const pkg of filteredDirect) {
        console.log(`   pnpm update ${pkg.name}@latest`);
      }
    }

    if (filteredTransitive.length > 0) {
      console.log('\n\n🔄 TRANSITIVE DEPENDENCIES:');
      console.log('─'.repeat(80));
      console.log('   These will likely be updated automatically when you update direct deps.\n');

      // Sort by package name for easier scanning
      filteredTransitive.sort((a, b) => a.name.localeCompare(b.name));

      for (const pkg of filteredTransitive) {
        console.log(`   ${emoji} ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
      }
    }

    // Show workspace-specific breakdown
    console.log('\n\n🏢 WORKSPACE BREAKDOWN:');
    console.log('─'.repeat(80));

    for (const [workspaceName, stats] of this.workspaceStats.entries()) {
      const severityCount = stats[this.filterSeverity];
      if (severityCount > 0) {
        const packages = stats.packages.filter(p => p.severity === this.filterSeverity);
        console.log(`\n   📦 ${workspaceName}: ${severityCount} ${this.filterSeverity} update${severityCount !== 1 ? 's' : ''}`);

        // Show all packages for this workspace with the selected severity
        for (const pkg of packages) {
          console.log(`      ${emoji} ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
        }
      }
    }

    console.log('');
  }

  /**
   * Display results in a helpful format
   */
  displayResults(results) {
    console.log('\n🎯 DEPENDENCY ANALYSIS RESULTS\n');

    // If filtering by severity, show filtered results
    if (this.filterSeverity) {
      this.displayFilteredResults(results);
      return;
    }

    // Workspace-specific statistics
    console.log('🏢 WORKSPACE BREAKDOWN:');
    console.log('   Outdated packages per workspace:\n');

    // Sort workspaces by percentage of outdated packages (descending), then by total count
    const sortedWorkspaces = Array.from(this.workspaceStats.entries())
      .sort(([nameA, a], [nameB, b]) => {
        const totalA = this.workspaceDepsCount.get(nameA) || 0;
        const totalB = this.workspaceDepsCount.get(nameB) || 0;
        const percentageA = totalA > 0 ? (a.total / totalA) * 100 : 0;
        const percentageB = totalB > 0 ? (b.total / totalB) * 100 : 0;

        // Sort by percentage first, then by total count
        if (Math.abs(percentageA - percentageB) > 0.1) {
          return percentageB - percentageA;
        }
        return b.total - a.total;
      });

        for (const [workspaceName, stats] of sortedWorkspaces) {
      const totalDeps = this.workspaceDepsCount.get(workspaceName) || 0;
      const outdatedCount = stats.total;
      const percentage = totalDeps > 0 ? ((outdatedCount / totalDeps) * 100).toFixed(1) : '0.0';

      if (stats.total === 0) {
        console.log(`   ✅ ${workspaceName}: All ${totalDeps} dependencies up to date! (0% outdated)`);
      } else {
        console.log(`   📦 ${workspaceName}: ${outdatedCount}/${totalDeps} outdated (${percentage}%)`);
        console.log(`      🔴 Major: ${stats.major} | 🟡 Minor: ${stats.minor} | 🟢 Patch: ${stats.patch}`);

        // Show top 3 most outdated packages for this workspace
        const topPackages = stats.packages
          .sort((a, b) => {
            const severityOrder = { major: 3, minor: 2, patch: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
          })
          .slice(0, 3);

        if (topPackages.length > 0) {
          console.log(`      Top issues: ${topPackages.map(p => {
            const emoji = p.severity === 'major' ? '🔴' : p.severity === 'minor' ? '🟡' : '🟢';
            return `${emoji} ${p.name} (${p.current}→${p.latest})`;
          }).join(', ')}`);
        }
        console.log('');
      }
    }
    console.log('');

        // Direct dependencies (most actionable)
    if (results.direct.length > 0) {
      console.log('🎯 DIRECT DEPENDENCIES (High Priority):');
      console.log('   Sorted by impact: workspace count → severity → version drift\n');

      const topDirect = results.direct.slice(0, 15);
      for (const pkg of topDirect) {
        const emoji = pkg.severity === 'major' ? '🔴' : pkg.severity === 'minor' ? '🟡' : '🟢';
        const impactEmoji = pkg.workspaceCount >= 5 ? '🌟' : pkg.workspaceCount >= 3 ? '⭐' : '';
        console.log(`   ${emoji} ${impactEmoji} ${pkg.name}`);
        console.log(`      ${pkg.current} → ${pkg.latest} (${pkg.severity})`);
        console.log(`      Used in ${pkg.workspaceCount} workspace${pkg.workspaceCount !== 1 ? 's' : ''}: ${pkg.workspaces.map(w => w.workspace).join(', ')}`);
        console.log('');
      }

      if (results.direct.length > 15) {
        console.log(`   ... and ${results.direct.length - 15} more direct dependencies\n`);
      }
    }

    // Sample of most outdated transitive dependencies
    if (results.transitive.length > 0) {
      console.log('🔄 MOST OUTDATED TRANSITIVE DEPENDENCIES (Lower Priority):');
      console.log('   These will likely be updated automatically when you update direct deps.\n');

      const topTransitive = results.transitive.slice(0, 10);
      for (const pkg of topTransitive) {
        const emoji = pkg.severity === 'major' ? '🔴' : pkg.severity === 'minor' ? '🟡' : '🟢';
        console.log(`   ${emoji} ${pkg.name}: ${pkg.current} → ${pkg.latest} (${pkg.severity})`);
      }

      if (results.transitive.length > 10) {
        console.log(`   ... and ${results.transitive.length - 10} more transitive dependencies\n`);
      }
    }

    // Generate update commands for highest impact packages
    const topUpdates = results.direct.slice(0, 5);
    if (topUpdates.length > 0) {
      console.log('🚀 SUGGESTED COMMANDS (highest impact first):');
      for (const pkg of topUpdates) {
        const impactNote = pkg.workspaceCount > 1 ? ` (affects ${pkg.workspaceCount} workspaces)` : '';
        console.log(`   pnpm update ${pkg.name}@latest${impactNote}`);
      }
      console.log('');
    }

    const generatedAt = new Date().toISOString();
    const latestCommit = this.getLatestCommitRef();

    // Summary at the end
    console.log('📈 SUMMARY:');
    console.log(`   Generated at: ${generatedAt}`);
    console.log(`   Latest commit: ${latestCommit}`);
    console.log(`   Total dependencies: ${this.directDeps.size}`);
    console.log(`   Total outdated: ${results.stats.total}`);
    console.log(`   Major updates: ${results.stats.major}`);
    console.log(`   Minor updates: ${results.stats.minor}`);
    console.log(`   Patch updates: ${results.stats.patch}`);
    console.log(`   Direct deps: ${results.direct.length}`);
    console.log(`   Transitive deps: ${results.transitive.length}\n`);
  }

  /**
   * Get the latest commit reference for the current checkout
   */
  getLatestCommitRef() {
    try {
      return execSync("git log -1 --format='%h %ad %s' --date=iso-strict", {
        encoding: 'utf8'
      }).trim();
    } catch (error) {
      return 'Unavailable';
    }
  }

  /**
   * Run pnpm audit and display a vulnerability summary
   */
  displayAuditSummary() {
    console.log('🔒 SECURITY AUDIT:\n');

    try {
      let stdout = '';
      try {
        stdout = execSync('pnpm audit --json', {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        });
      } catch (error) {
        // pnpm audit exits with non-zero when vulnerabilities are found
        stdout = error.stdout || '';
      }

      if (!stdout || !stdout.trim()) {
        console.log('   ⚠️  Could not parse audit summary\n');
        return;
      }

      const data = JSON.parse(stdout);
      if (data.metadata && data.metadata.vulnerabilities) {
        const v = data.metadata.vulnerabilities;
        const total = v.info + v.low + v.moderate + v.high + v.critical;
        console.log(`   Total vulnerabilities: ${total}`);
        console.log(`   🔴 Critical: ${v.critical}`);
        console.log(`   🟠 High:     ${v.high}`);
        console.log(`   🟡 Moderate: ${v.moderate}`);
        console.log(`   🟢 Low:      ${v.low}`);
        if (v.info > 0) {
          console.log(`   ℹ️  Info:     ${v.info}`);
        }
        console.log(`   Total dependencies scanned: ${data.metadata.totalDependencies}\n`);
      } else {
        console.log('   ⚠️  Could not parse audit summary\n');
      }
    } catch (error) {
      console.log(`   ⚠️  Audit failed: ${error.message}\n`);
    }
  }

    async run() {
    try {
      // Change to project root directory to run commands correctly
      const rootDir = path.join(__dirname, '../..');
      process.chdir(rootDir);

      this.loadRenovateConfig();
      await this.findWorkspaces();
      this.extractDirectDependencies();
      const outdatedData = await this.getOutdatedPackages();

      if (outdatedData.length === 0) {
        console.log('🎉 All packages are up to date!');
        return;
      }

      const results = this.processOutdatedPackages(outdatedData);
      this.displayResults(results);
      this.displayAuditSummary();

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// Run the detector
const detector = new LockfileDriftDetector();
detector.run();
