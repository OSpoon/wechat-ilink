import { execSync } from 'node:child_process'

if (process.env.MIGRATE === 'true') {
  console.log('Running database migrations...')
  execSync('node ace migration:run --force', { stdio: 'inherit' })
}

console.log('Starting AdonisJS server...')
await import('./bin/server.js')
