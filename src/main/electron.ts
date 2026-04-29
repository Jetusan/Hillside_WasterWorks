    // Load ts-node to run TypeScript directly
    require('ts-node').register({
        transpileOnly: true,
        compilerOptions: {
            module: 'commonjs',
            target: 'es2020',
            moduleResolution: 'node',
            esModuleInterop: true,
            skipLibCheck: true
        }
    });

    // Load the main application
    require('./index');