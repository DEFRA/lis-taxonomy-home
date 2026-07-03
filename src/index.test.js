import assert from 'node:assert/strict'
import test from 'node:test'

import * as packageExports from './index.js'
import { taxonomy } from './taxonomy.js'

test('index re-exports the home taxonomy definition', () => {
  assert.equal(packageExports.taxonomy, taxonomy)
  assert.deepEqual(taxonomy, {
    id: 'home',
    label: 'Home',
    summary: 'Home screen for the selected species.',
    accessMode: 'hub-service',
    permissionButtons: {
      register: 'Register a birth',
      move: 'Move Livestock',
      death: 'Register a death'
    }
  })
})
