import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const sourceUrl = process.env.OPENAPI_URL ?? 'https://backendssasrrhh-production-7c33.up.railway.app/openapi.json'
const outputPath = join(mkdtempSync(join(tmpdir(), 'ssas-openapi-')), 'schema.d.ts')
const cliPath = join(process.cwd(), 'node_modules', 'openapi-typescript', 'bin', 'cli.js')

try {
  const result = spawnSync(process.execPath, [cliPath, sourceUrl, '-o', outputPath], {
    encoding: 'utf8',
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  const expected = readFileSync(join(process.cwd(), 'src', 'shared', 'api', 'schema.d.ts'), 'utf8')
  const generated = readFileSync(outputPath, 'utf8')

  if (expected !== generated) {
    console.error('OpenAPI drift detected. Run npm run generate:api and review the diff.')
    process.exit(1)
  }

  console.log('OpenAPI contract is synchronized.')
} finally {
  rmSync(outputPath, { force: true })
  rmSync(join(outputPath, '..'), { recursive: true, force: true })
}
