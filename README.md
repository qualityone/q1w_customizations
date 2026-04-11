# Q1W NetSuite SDF Project Template

A standardized NetSuite SuiteCloud Development Framework (SDF) project template with ES6 to AMD 2.1 transpilation, comprehensive linting, and Kiro steering rules.

## Features

- **ES6 to AMD 2.1 Transpilation** - Write modern JavaScript, deploy NetSuite-compatible code
- **Comprehensive ESLint Configuration** - Enforces coding standards automatically
- **Prettier Integration** - Consistent code formatting
- **Kiro Steering Rules** - AI-assisted development follows project standards
- **Script Templates** - Ready-to-use templates for all script types
- **Jest Testing** - Unit testing with NetSuite module mocks

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run watch:build

# Run linting
npm run lint

# Run tests
npm test

# Deploy to NetSuite (requires authentication)
npm run deploy / or single file deploy
```

## Project Structure

```
q1w_project_template/
├── .kiro/steering/          # Kiro AI steering rules
├── src/
│   ├── FileCabinet/
│   │   └── SuiteScripts/
│   │       └── q1w_company/erp/project_name/
│   │           ├── userevent/       # UserEvent scripts
│   │           ├── clientscript/    # Client scripts
│   │           ├── suitelet/        # Suitelets
│   │           ├── scheduledscript/ # Scheduled scripts
│   │           ├── map_reduce/      # Map/Reduce scripts
│   │           ├── modules/         # Reusable modules
│   │           │   ├── managers/    # Business logic
│   │           │   ├── dao/         # Data access
│   │           │   └── helper/      # Utilities
│   │           └── constants/       # Constants files
│   └── Objects/                     # SDF custom objects
├── dist/                            # Build output
└── __mocks__/                       # Jest mocks
```

## NPM Scripts

| Script                      | Description                      |
| --------------------------- | -------------------------------- |
| `npm run build`             | Transpile ES6 to AMD 2.1         |
| `npm run build:notranspile` | Copy files without transpilation |
| `npm run watch:build`       | Watch mode for development       |
| `npm run clean`             | Clean the dist folder            |
| `npm run lint`              | Run ESLint                       |
| `npm run lint:fix`          | Fix ESLint errors automatically  |
| `npm test`                  | Run Jest tests                   |
| `npm run deploy`            | Deploy to NetSuite               |
| `npm run deploy:dry`        | Dry run deployment               |

## Coding Standards

### File Naming

Scripts must follow the pattern: `q1w_<recordtype>_<scripttype>.js`

| Script Type     | Suffix | Example                |
| --------------- | ------ | ---------------------- |
| UserEvent       | `_ue`  | `q1w_salesorder_ue.js` |
| ClientScript    | `_cs`  | `q1w_salesorder_cs.js` |
| Suitelet        | `_sl`  | `q1w_report_sl.js`     |
| ScheduledScript | `_ss`  | `q1w_cleanup_ss.js`    |
| MapReduce       | `_mr`  | `q1w_batch_mr.js`      |

### Variable Declarations

- **NEVER** use `var` - use `const` or `let` only
- Use `const` by default
- Use `let` only when reassignment is needed

### Error Handling

Every function must have its own try-catch block:

```javascript
const processOrder = (context) => {
  const logTitle = 'q1w_order_manager => processOrder';

  try {
    log.debug({ title: logTitle, details: 'Processing started' });
    // Business logic here
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify(error) });
    throw error;
  }
};
```

### UserEvent Guidelines

- One UserEvent per record type when possible
- Split into multiple files when imports exceed 10 modules
- Delegate business logic to manager modules

## Steering Rules

See `.kiro/steering/` for detailed documentation:

- `coding-standards.md` - ES6, variable declarations, JSDoc
- `file-naming.md` - Naming conventions for all file types
- `error-handling.md` - Error handling patterns
- `userevent-guidelines.md` - UserEvent organization
- `module-organization.md` - Manager/DAO/Helper patterns

## Deployment

1. Configure authentication:

   ```bash
   suitecloud account:setup
   ```

2. Update `project.json` with your `defaultAuthId`

3. Deploy:
   ```bash
   npm run deploy
   ```

## License

Proprietary - Q1W
