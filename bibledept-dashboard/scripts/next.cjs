const { spawn } = require('node:child_process')

const [command, environment = process.env.NEXT_PUBLIC_ENV || 'dev', ...args] = process.argv.slice(2)
if (!['dev', 'build', 'start'].includes(command) || !['dev', 'staging', 'prod'].includes(environment)) {
  console.error('Usage: node scripts/next.cjs <dev|build|start> [dev|staging|prod] [...Next.js arguments]')
  process.exit(1)
}

const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), command, ...args], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_ENV: environment },
})
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
