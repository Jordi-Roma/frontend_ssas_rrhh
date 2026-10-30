import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const source = process.env.OPENAPI_URL ?? 'https://backendssasrrhh-production-7c33.up.railway.app/openapi.json'
const cli = join(process.cwd(), 'node_modules', 'openapi-typescript', 'bin', 'cli.js')
const result = spawnSync(process.execPath, [cli, source, '-o', 'src/shared/api/schema.d.ts'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
