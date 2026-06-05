/**
 * Changelog auto-update script (triggered by npm `version` lifecycle hook)
 *
 * When `npm version <patch|minor|major>` runs, this script:
 *   1. Replaces `## [Unreleased]` with `## [<new-version>] - <today>`
 *   2. Prepends a fresh `## [Unreleased]` block
 *   3. Updates the version-link footer
 *   4. Stages CHANGELOG.md so it's included in npm's version commit
 *
 * Usage:
 *   npm run release:patch
 *   npm run release:minor
 *   npm run release:major
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../../../') // repo root
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

// ── main ─────────────────────────────────────────────────────────────

const newVersion = process.env.npm_package_version
if (!newVersion) {
  console.error('❌ npm_package_version not set – run via `npm version`.')
  process.exit(1)
}

let content = fs.readFileSync(changelogPath, 'utf8')

if (!content.includes('## [Unreleased]')) {
  console.error('❌ CHANGELOG.md must contain a `## [Unreleased]` section.')
  process.exit(1)
}

// 1. Turn [Unreleased] into dated version header
content = content.replace('## [Unreleased]', `## [${newVersion}] - ${today()}`)

// 2. Prepend fresh Unreleased block
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

content = unreleasedBlock + content

// 3. Update version links
const repoUrl = 'https://github.com/kindbgen/ppt-narrator'

// Replace old [Unreleased] link → comparison from new version to HEAD
content = content.replace(
  /^\[Unreleased\]:.*$/m,
  `[Unreleased]: ${repoUrl}/compare/v${newVersion}...HEAD`
)

// Insert new version link before the first existing version link
content = content.replace(
  /^\[(\d+\.\d+\.\d+)\]:/m,
  `[${newVersion}]: ${repoUrl}/releases/tag/v${newVersion}\n[$1]:`
)

// 4. Write back
fs.writeFileSync(changelogPath, content, 'utf8')
console.log(`✅ CHANGELOG.md updated for v${newVersion}`)

// 5. Stage for the npm version commit
execSync(`git add "${changelogPath}"`, { cwd: rootDir })
console.log('✅ CHANGELOG.md staged for version commit')
