const _ = require('lodash')

/**
 * Sorts entities according to relations between them
 *
 * @param {SchemaFlatter~Metadata} metadata Metadata
 * @param {boolean} [ownerFirst=] If true, owner comes first, otherwise owned comes first
 * @return {string[]} Array of entity names
 */
function getEntitiesOrderedByRelations (metadata, ownerFirst = true) {
  let entities = _.keys(metadata)

  const lFirst = ownerFirst ? -1 : +1
  const rFirst = ownerFirst ? +1 : -1

  entities = entities.sort((l, r) => {
    const lMetadata = metadata[l]
    const rMetadata = metadata[r]

    if (l === r) {
      return 0
    }

    if (lMetadata.relations && lMetadata.relations[r]) {
      return _.startsWith(lMetadata.relations[r], 'one-to-') ? lFirst : rFirst
    } else if (rMetadata.relations && rMetadata.relations[l]) {
      return _.startsWith(rMetadata.relations[l], 'one-to-') ? rFirst : lFirst
    }
    return l.localeCompare(r)
  })

  return entities
}

module.exports = getEntitiesOrderedByRelations
