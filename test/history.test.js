import { describe, expect, it, vi } from 'vitest'

import { historySnapshot } from './history.js'
import { taxonomy } from './taxonomy.js'

describe('historySnapshot', () => {
  it('filters holdings by species and enriches matching CPHs', async () => {
    const livestockService = vi.fn().mockResolvedValue({
      permissions: ['lis-perm-ctt-register-write'],
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
          group_name: 'Sheep Farm',
          cphs: [
            {
              cph: '11/111/1111',
              latitude: 51.5,
              longitude: -0.1,
              allowedSpecies: ['shp']
            }
          ]
        }
      ]
    })
    const holdingService = vi.fn().mockResolvedValue({
      ctt: [{ id: 'animal-1' }, { id: 'animal-2' }]
    })
    const hubAuth = { sub: 'user-1' }

    const snapshot = await historySnapshot(
      { app: { hubAuth } },
      'ctt',
      'cattle',
      livestockService,
      holdingService
    )

    expect(livestockService).toHaveBeenCalledOnce()
    expect(livestockService).toHaveBeenCalledWith(hubAuth)
    expect(holdingService).toHaveBeenCalledOnce()
    expect(holdingService).toHaveBeenCalledWith('12/345/6789')
    expect(snapshot.permissions).toEqual([])
    expect(snapshot.holdings).toEqual([
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
  })

  it('creates holding and overall map summaries with sequential pins', async () => {
    const holdingService = vi
      .fn()
      .mockResolvedValueOnce({ ctt: [{ id: 'animal-1' }] })
      .mockResolvedValueOnce({ ctt: [] })

    const snapshot = await historySnapshot(
      {},
      'ctt',
      'cattle',
      async () => ({
        permissions: null,
        holdings: [
          {
            group_name: 'North Farm',
            cphs: [
              {
                cph: '12/345/6789',
                latitude: 52.1,
                longitude: 0.12,
                allowedSpecies: ['ctt']
              }
            ]
          },
          {
            group_name: 'South Farm',
            cphs: [
              {
                cph: '98/765/4321',
                latitude: 50.7,
                longitude: -1.5,
                allowedSpecies: ['ctt']
              }
            ]
          }
        ]
      }),
      holdingService
    )

    const firstPin = 'pin-l-1+b44656(0.12,52.1)'
    const secondPin = 'pin-l-2+b44656(-1.5,50.7)'
    expect(snapshot.summary.rows).toEqual([
      {
        name: 'North Farm',
        cphs: [
          {
            id: '12/345/6789',
            latitude: 52.1,
            longitude: 0.12,
            count: 1,
            mapPin: firstPin
          }
        ],
        pins: firstPin,
        mapUrl: expect.stringContaining(`/static/${firstPin}/auto/300x200?`)
      },
      {
        name: 'South Farm',
        cphs: [
          {
            id: '98/765/4321',
            latitude: 50.7,
            longitude: -1.5,
            count: 0,
            mapPin: secondPin
          }
        ],
        pins: secondPin,
        mapUrl: expect.stringContaining(`/static/${secondPin}/auto/300x200?`)
      }
    ])
    expect(snapshot.summary.mapUrl).toContain(
      `/static/${firstPin},${secondPin}/auto/400x300?`
    )
    expect(snapshot.summary.mapUrl).toContain(
      'access_token=ADD_OWN_MAPBOX_KEY_HERE'
    )
  })

  it('returns an empty summary and does not fetch holding profiles when none match', async () => {
    const holdingService = vi.fn()

    const snapshot = await historySnapshot(
      undefined,
      'ctt',
      'cattle',
      async (hubAuth) => {
        expect(hubAuth).toBeUndefined()
        return {
          permissions: [],
          holdings: [
            {
              group_name: 'Sheep Farm',
              cphs: [
                {
                  cph: '11/111/1111',
                  allowedSpecies: ['shp']
                }
              ]
            }
          ]
        }
      },
      holdingService
    )

    expect(holdingService).not.toHaveBeenCalled()
    expect(snapshot).toEqual({
      permissions: [],
      holdings: [],
      summary: { rows: [] }
    })
  })

  it('builds unique species and application permission buttons', async () => {
    taxonomy.permissionButtons = {
      register: 'Register a birth',
      'record-move': 'Record a movement'
    }

    try {
      const snapshot = await historySnapshot(
        {},
        'ctt',
        'cattle',
        async () => ({
          permissions: [
            ' LIS-PERM-CATTLE-ADMIN ',
            'lis-perm-ctt-record-move-read',
            'lis-perm-ctt-register-write',
            'lis-perm-ctt-register-write',
            'lis-perm-ctt-unknown-write',
            'lis-perm-sheep-register-write',
            'lis-perm-ctt-register-view',
            'not-a-permission',
            '',
            null
          ],
          holdings: []
        }),
        vi.fn()
      )

      expect(snapshot.permissions).toEqual([
        {
          id: 'register',
          label: 'Register a birth',
          url: '/cattle/register'
        },
        {
          id: 'record-move',
          label: 'Record a movement',
          url: '/cattle/record-move'
        }
      ])
    } finally {
      delete taxonomy.permissionButtons
    }
  })
})
