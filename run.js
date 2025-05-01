const { spawn } = require('child_process');

// Start the first script (script1.js)
const script1 = spawn('node', ['index.js']);

// Log any output from script1
script1.stdout.on('data', (data) => {
  console.log(`Script1 Output: ${data}`);
});

// Log any errors from script1
script1.stderr.on('data', (data) => {
  console.error(`Script1 Error: ${data}`);
});

// Handle script1 process exit
script1.on('close', (code) => {
  console.log(`Script1 exited with code ${code}`);
});

// Start the second script (script2.js)
const script2 = spawn('node', ['ai-bot.js']);

// Log any output from script2
script2.stdout.on('data', (data) => {
  console.log(`Script2 Output: ${data}`);
});

// Log any errors from script2
script2.stderr.on('data', (data) => {
  console.error(`Script2 Error: ${data}`);
});

// Handle script2 process exit
script2.on('close', (code) => {
  console.log(`Script2 exited with code ${code}`);
});

console.log('Both scripts are running...');
