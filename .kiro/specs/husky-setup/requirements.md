# Husky Setup

## User Stories

1. As a developer, I want staged files linted/formatted on commit so bad code doesn't get committed.
2. As a developer, I want tests and build to run on push so broken code doesn't reach remote.
3. As a team lead, I want commit messages validated against conventional commit format.

## Acceptance Criteria

- 1.1 Husky installed as devDependency, `.husky/` dir initialized
- 1.2 Pre-commit hook runs lint-staged (ESLint + Prettier on staged `src/**/*.js`)
- 1.3 lint-staged auto-fixes where possible
- 2.1 Pre-push hook runs `npm test` and `npm run build`; blocks push on failure
- 3.1 commit-msg hook validates conventional commit format (`type(scope): subject`)
- 3.2 Commit message validation is optional (can be skipped)

## Dependencies

- `husky`, `lint-staged`
- `@commitlint/cli`, `@commitlint/config-conventional` (optional)

## Constraints

- Must work on Windows (cmd shell)
- Must not slow down commit/push noticeably
- Bypassable with `--no-verify`
