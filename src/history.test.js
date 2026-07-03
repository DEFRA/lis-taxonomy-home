import assert from 'node:assert/strict'
import test from 'node:test'

import { historySnapshot } from './history.js'

test('historySnapshot builds quick links, filters holdings and creates map summaries', async () => {
  const profileService = async (hubAuth) => {
    assert.deepEqual(hubAuth, { sub: 'user-1' })

    return {
      permissions: [
        'lis-perm-cattle-register-write',
        'lis-perm-ctt-move-read',
        null,
        'lis-perm-cattle-register-view',
        'invalid-permission'
      ],
      holdings: [
        {
          group_name: 'North Farm',
          cphs: [
            {
              cph: '12/345/6789',
              latitude: 52.1,
              longitude: 0.12,
              allowedSpecies: ['ctt', 'shp']
            },
            {
              cph: '98/765/4321',
              latitude: 53.2,
              longitude: -1.5,
              allowedSpecies: ['shp']
            }
          ]
        },
        {
          group_name: 'Empty Group',
          cphs: [
            {
              cph: '11/111/1111',
              latitude: 51.5,
              longitude: -0.1,
              allowedSpecies: []
            }
          ]
        }
      ]
    }
  }

  const seenCphs = []
  const holdingService = async (cph) => {
    seenCphs.push(cph)

    return {
      ctt: [{ id: 'animal-1' }, { id: 'animal-2' }]
    }
  }

  const snapshot = await historySnapshot(
    { app: { hubAuth: { sub: 'user-1' } } },
    'ctt',
    'cattle',
    profileService,
    holdingService
  )

  assert.deepEqual(snapshot.permissions, [
    {
      id: 'register',
      label: 'Register a birth',
      url: '/cattle/register'
    },
    {
      id: 'move',
      label: 'Move Livestock',
      url: '/cattle/move'
    }
  ])

  assert.deepEqual(seenCphs, ['12/345/6789'])
  assert.deepEqual(snapshot.holdings, [
    {
      group_name: 'North Farm',
      cphs: [
        {
          cph: '12/345/6789',
          latitude: 52.1,
          longitude: 0.12,
          allowedSpecies: ['ctt'],
          animals: [{ id: 'animal-1' }, { id: 'animal-2' }],
          animal_count: 2
        }
      ]
    }
  ])

  assert.deepEqual(snapshot.summary.rows, [
    {
      name: 'North Farm',
      cphs: [
        {
          id: '12/345/6789',
          latitude: 52.1,
          longitude: 0.12,
          count: 2,
          mapPin: 'pin-l-1+b44656(0.12,52.1)'
        }
      ],
      pins: 'pin-l-1+b44656(0.12,52.1)',
      mapUrl:
        'https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-1+b44656(0.12,52.1)/auto/300x200?attribution=true&logo=true&access_token=ADD_OWN_MAPBOX_KEY_HERE'
    }
  ])
  assert.equal(
    snapshot.summary.mapUrl,
    'https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-1+b44656(0.12,52.1)/auto/400x300?attribution=true&logo=true&access_token=ADD_OWN_MAPBOX_KEY_HERE'
  )
})

test('historySnapshot expands species-wide permissions and tolerates missing permission arrays', async () => {
  const snapshotWithSpeciesPermission = await historySnapshot(
    { app: { hubAuth: { sub: 'user-2' } } },
    'ctt',
    'cattle',
    async () => ({
      permissions: ['lis-perm-cattle-admin', 'lis-perm-cattle-unknown-write'],
      holdings: []
    }),
    async () => ({ ctt: [] })
  )

  assert.deepEqual(snapshotWithSpeciesPermission.permissions, [
    {
      id: 'register',
      label: 'Register a birth',
      url: '/cattle/register'
    },
    {
      id: 'move',
      label: 'Move Livestock',
      url: '/cattle/move'
    },
    {
      id: 'death',
      label: 'Register a death',
      url: '/cattle/death'
    }
  ])
  assert.deepEqual(snapshotWithSpeciesPermission.summary, { rows: [] })

  const snapshotWithoutPermissions = await historySnapshot(
    { app: { hubAuth: { sub: 'user-3' } } },
    'ctt',
    'cattle',
    async () => ({
      permissions: null,
      holdings: []
    }),
    async () => ({ ctt: [] })
  )

  assert.deepEqual(snapshotWithoutPermissions.permissions, [])
  assert.deepEqual(snapshotWithoutPermissions.summary, { rows: [] })
})
