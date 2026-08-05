import { describe, expect, it } from 'vitest'

import * as packageExports from '../src/index.js'
import { taxonomy } from '../src/taxonomy.js'

describe('package exports', () => {
  it('exports the home taxonomy definition', () => {
    expect(packageExports.taxonomy).toBe(taxonomy)
    expect(taxonomy).toEqual({
      id: 'home',
      label: 'Home',
      summary: 'Home screen for the selected species.',
      accessMode: 'hub-service'
    })
  })
})
