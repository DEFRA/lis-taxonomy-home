import { taxonomy } from "./taxonomy.js"
import { config } from "/config/config.js"

function buildHistoryRows(history) {
  let counter= 1
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
        mapPin: `pin-l-${counter++}+b44656(${cph.longitude},${cph.latitude})`,
      })),
    };

    const pins = holdingSummary.cphs.map((cph) => cph.mapPin).join(",");
    if (pins) {
      holdingSummary.mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pins}/auto/300x200?attribution=true&logo=true&access_token=${mapboxApiKey}`;
      holdingSummary.pins = pins
    }

    results.rows.push(holdingSummary);
  }

  const pins = results.rows.map((row) => row.pins).join(",");
  if (pins) {
    results.mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pins}/auto/400x300?attribution=true&logo=true&access_token=${mapboxApiKey}`;
  }

  return results
}

export async function historySnapshot(request, speciesId, species, livestockService, holdingService) {
  const submissions = await livestockService()
  const filteredPermissions = user.permissions
    .filter((permission) => permission.startsWith(`${speciesId}.`))
    .map((permission) => ({
      id: permission.split(".")[1],
      label: taxonomy.permissionButtons[permission.split(".")[1]],
      url: `/${permission.split(".")[1]}/${species}`,
    }));

  const filteredHoldings = user
    .holdings
    .map((group) => ({
      ...group,
      cphs: group.cphs
        .map((cph) => ({
          ...cph,
          allowedSpecies: cph.allowedSpecies.filter(
            (species) => species === speciesId,
          ),
        }))
        .filter((cph) => cph.allowedSpecies.length > 0),
    }))
    .filter((group) => group.cphs.length > 0)

  for (const holding of filteredHoldings) {
    for (const cph of holding.cphs) {
      const holdingProfile = await holdingService(cph.cph);
      cph.animals = holdingProfile[speciesId];
      cph.animal_count = holdingProfile[speciesId].length;
    }
  }

  const snapshot = {
    permissions: filteredPermissions,
    holdings: filteredHoldings,
  }
  snapshot.summary = buildSummaryRows(snapshot)
  return snapshot
}
