import { taxonomy } from './taxonomy.js'
import { config } from './config/config.js'

const PERMISSION_PREFIX = 'lis-perm-'
const ACCESS_LEVELS = new Set(['read', 'write', 'admin'])

function buildHistoryRows(history) {
  let counter = 1
  const mapboxApiKey = config.get('mapbox.apiKey')
  const results = {}
  results.rows = []

  for (const holding of snapshot.holdings) {
    const holdingSummary = {
      name: holding.group_name,
      cphs: holding.cphs.map((cph) => ({
        id: cph.cph,
        latitude: cph.latitude,
        longitude: cph.longitude,
        count: cph.animals.length,
        mapPin: `pin-l-${counter++}+b44656(${cph.longitude},${cph.latitude})`
      }))
    }

    const pins = holdingSummary.cphs.map((cph) => cph.mapPin).join(',')
    if (pins) {
      holdingSummary.mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pins}/auto/300x200?attribution=true&logo=true&access_token=${mapboxApiKey}`
      holdingSummary.pins = pins
    }

    results.rows.push(holdingSummary)
  }

  const pins = results.rows.map((row) => row.pins).join(',')
  if (pins) {
    results.mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pins}/auto/400x300?attribution=true&logo=true&access_token=${mapboxApiKey}`
  }

  return results
}

export async function historySnapshot(
  request,
  speciesId,
  species,
  livestockService,
  holdingService
) {
  const filteredPermissions = getSpeciesPermissionButtons(user.permissions, {
    speciesId,
    speciesSlug: species
  })

  const filteredHoldings = user.holdings
    .map((group) => ({
      ...group,
      cphs: group.cphs
        .map((cph) => ({
          ...cph,
          allowedSpecies: cph.allowedSpecies.filter(
            (species) => species === speciesId
          )
        }))
        .filter((cph) => cph.allowedSpecies.length > 0)
    }))
    .filter((group) => group.cphs.length > 0)

  for (const holding of filteredHoldings) {
    for (const cph of holding.cphs) {
      const holdingProfile = await holdingService(cph.cph)
      cph.animals = holdingProfile[speciesId]
      cph.animal_count = holdingProfile[speciesId].length
    }
  }

  const snapshot = {
    permissions: filteredPermissions,
    holdings: filteredHoldings
  }
  snapshot.summary = buildSummaryRows(snapshot)
  return snapshot
}

function getSpeciesPermissionButtons(permissions, { speciesId, speciesSlug }) {
  if (!Array.isArray(permissions)) {
    return []
  }

  const taxonomyIds = new Set()

  for (const permission of permissions) {
    const parsedPermission = parsePermission(permission)

    if (
      !parsedPermission ||
      (parsedPermission.speciesId !== speciesId &&
        parsedPermission.speciesId !== speciesSlug)
    ) {
      continue
    }

    if (parsedPermission.type === 'species') {
      for (const taxonomyId of Object.keys(taxonomy.permissionButtons)) {
        taxonomyIds.add(taxonomyId)
      }

      continue
    }

    if (
      parsedPermission.type === 'app' &&
      taxonomy.permissionButtons[parsedPermission.taxonomyId]
    ) {
      taxonomyIds.add(parsedPermission.taxonomyId)
    }
  }

  return [...taxonomyIds].map((taxonomyId) => ({
    id: taxonomyId,
    label: taxonomy.permissionButtons[taxonomyId],
    url: `/${speciesSlug}/${taxonomyId}`
  }))
}

function parsePermission(permission) {
  if (typeof permission !== 'string' || permission.length === 0) {
    return null
  }

  const normalizedPermission = permission.toLowerCase().trim()

  if (!normalizedPermission.startsWith(PERMISSION_PREFIX)) {
    return null
  }

  const parts = normalizedPermission
    .slice(PERMISSION_PREFIX.length)
    .split('-')
    .filter(Boolean)

  if (parts.length < 2 || !ACCESS_LEVELS.has(parts.at(-1))) {
    return null
  }

  const scopeParts = parts.slice(0, -1)

  if (scopeParts.length === 1) {
    return {
      type: 'species',
      speciesId: scopeParts[0]
    }
  }

  return {
    type: 'app',
    speciesId: scopeParts[0],
    taxonomyId: scopeParts.slice(1).join('-')
  }
}
