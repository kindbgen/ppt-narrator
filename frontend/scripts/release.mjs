/**
 * Release script — bumps version, updates CHANGELOG.md, commits + tags.
 *
 * Usage:
 *   node scripts/release.mjs patch
 *   node scripts/release.mjs minor
 *   node scripts/release.mjs major
 *
 * Also available via npm scripts:
 *   npm run release:patch
 *   npm run release:minor
 *   npm run release:major
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../../') // repo root
const pkgPath = path.join(rootDir, 'frontend', 'package.json')
const changelogPath = path.join(rootDir, 'CHANGELOG.md')

// ── helpers ──────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)

function git(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function bumpVersion(current, type) {
  const parts = current.split('.').map(Number)
  if (type === 'major') return `${parts[0] + 1}.0.0`
  if (type === 'minor') return `${parts[0]}.${parts[1] + 1}.0`
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}` // patch
}

// ── main ─────────────────────────────────────────────────────────────

const bumpType = process.argv[2]
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node scripts/release.mjs <patch|minor|major>')
  process.exit(1)
}

// 0. Ensure files we touch are not already modified
const dirtyFiles = git('git diff --name-only -- frontend/package.json CHANGELOG.md')
if (dirtyFiles) {
  console.error('❌ The following files have uncommitted changes:')
  console.error(dirtyFiles)
  console.error('Please commit or stash them first.')
  process.exit(1)
}

// 1. Bump version in package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const oldVersion = pkg.version
const newVersion = bumpVersion(oldVersion, bumpType)
pkg.version = newVersion
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
console.log(`📦 package.json: ${oldVersion} → ${newVersion}`)

// 2. Update CHANGELOG.md
let content = fs.readFileSync(changelogPath, 'utf8')

if (!content.includes('## [Unreleased]')) {
  console.error('❌ CHANGELOG.md must contain a `## [Unreleased]` section.')
  process.exit(1)
}

// Turn [Unreleased] into dated version header
content = content.replace('## [Unreleased]', `## [${newVersion}] - ${today()}`)

// Insert fresh Unreleased block before the first version heading
const unreleasedBlock = [
  '## [Unreleased]',
  '',
  '### Added',
  '',
  '### Changed',
  '',
  '### Deprecated',
  '',
  '### Removed',
  '',
  '### Fixed',
  '',
  '### Security',
  '',
  '---',
  '',
].join('\n')

const firstHeadingRegex = /^## \[[\d.]+\]/m
const match = firstHeadingRegex.exec(content)
if (!match) {
  console.error('❌ Could not locate version heading in CHANGELOG.md.')
  process.exit(1)
}
content = content.slice(0, match.index) + unreleasedBlock + content.slice(match.index)

// Update version links
const repoUrl = 'https://github.com/kindbgen/ppt-narrator'
content = content.replace(
  /^\[Unreleased\]:.*$/m,
  `[Unreleased]: ${repoUrl}/compare/v${newVersion}...HEAD`
)
content = content.replace(
  /^\[(\d+\.\d+\.\d+)\]:/m,
  `[${newVersion}]: ${repoUrl}/releases/tag/v${newVersion}\n[$1]:`
)

fs.writeFileSync(changelogPath, content, 'utf8')
console.log(`📝 CHANGELOG.md updated for v${newVersion}`)

// 3. Git commit + tag
execSync('git add frontend/package.json CHANGELOG.md', { cwd: rootDir })
execSync(`git commit -m "chore: release v${newVersion}"`, { cwd: rootDir })
execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { cwd: rootDir })
console.log(`🏷️  Git commit + tag v${newVersion} created`)
console.log('')
console.log('Next steps:')
console.log(`  git push --follow-tags origin main`)
