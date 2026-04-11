const fs = require('fs');

module.exports = {
  defaultProjectFolder: 'src',
  commands: {
    'project:deploy': {
      projectFolder: 'dist',
      async beforeExecuting(args) {
        const dir = `${this.projectFolder}/Objects`;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
        console.log('Project Deployment Started!');
        return args;
      },
    },
    'object:import': {
      projectFolder: 'src',
      async beforeExecuting(args) {
        const dir = `${this.projectFolder}/Objects`;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
        console.log('Object Import Started!');
        return args;
      },
    },
    'file:upload': {
      projectFolder: 'dist',
    },
    'project:validate': {
      projectFolder: 'dist',
    },
  },
};
