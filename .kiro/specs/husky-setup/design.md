# Design: Husky Setup

## Overview

Configure Git hooks via Husky to enforce code quality gates at commit and push time. This is a tooling/configuration feature — no application code changes, only devDependencies, config files, and hook scripts.

## Architecture

```
.husky/
├── pre-commit      → runs lint-staged (ESLint --fix + Prettier on staged src/**/*.js)
├── pre-push        → runs npm test && npm run build
└── commit-msg      → runs commitlint against conventional commit format

package.json        → lint-staged config, prepare script
.commitlintrc.json  → commitlint config extending @commitlint/config-conventional
```

All hooks are shell scripts managed by Husky v9+. On Windows, Husky uses Git's built-in shell (Git Bash) for hook execution, so POSIX-style scripts work cross-platform.

## Components and Interfaces

### 1. Husky Core

- `husky` devDependency provides the Git hook manager
- `"prepare": "husky"` script in package.json initializes hooks on `npm install`
- `.husky/` directory contains hook scripts

### 2. Pre-commit Hook (lint-staged)

- Runs `npx lint-staged` on pre-commit
- lint-staged config in package.json targets `src/**/*.js`
- Runs `eslint --fix` then `prettier --write` on staged files only

### 3. Pre-push Hook

- Runs `npm test && npm run build`
- Fails fast — if tests fail, build doesn't run and push is blocked

### 4. Commit-msg Hook (commitlint)

- Runs `npx --no -- commitlint --edit $1`
- `.commitlintrc.json` extends `@commitlint/config-conventional`
- Validates format: `type(scope): subject` where type ∈ {feat, fix, docs, style, refactor, test, chore, ...}

## Data Models

No data models — this is a configuration-only feature.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do._

Property 1: Conventional commit format validation
_For any_ string matching the pattern `type(scope): subject` where type is a valid conventional commit type, commitlint should accept the message. _For any_ string not matching this pattern, commitlint should reject it.
**Validates: Requirements 3.1**

## Error Handling

- All hooks are bypassable with `git commit --no-verify` / `git push --no-verify`
- lint-staged failures show ESLint errors to the developer and block commit
- Pre-push test/build failures show output and block push
- commitlint failures show the expected format and block commit

## Testing Strategy

This is a configuration/tooling feature. Validation is done by:

1. Verifying config files exist with correct content
2. Running `npx commitlint --from HEAD~1` to validate commitlint config works
3. Running `npx lint-staged --diff="HEAD~1"` to validate lint-staged config works
4. Manual smoke test: make a commit and push to verify hooks fire

No property-based testing library is needed — the single property (commit format validation) is handled by the third-party `@commitlint/config-conventional` package which has its own test suite.
