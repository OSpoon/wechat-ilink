import { defineConfig } from 'bumpp'

export default defineConfig({
  recursive: true,
  all: true,
  install: true,
  commit: 'chore: release v%s',
  tag: 'v%s',
  push: false,
})
