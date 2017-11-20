const _ = require('lodash')

/**
 * Sorts entities according to relations between them
 *
 * @param {SchemaFlatter~Metadata} metadata Metadata
 * @return {string[]} Array of entity names
 */
function getEntitiesOrderedByRelations (metadata) {
  let entities = _.keys(metadata)

  entities = entities.sort((l, r) => {
    const lMetadata = metadata[l]
    const rMetadata = metadata[r]

    if (l === r) {
      return 0
    }

    if (lMetadata.relations && lMetadata.relations[r]) {
      return _.startsWith(lMetadata.relations[r], 'one-to-') ? +1 : -1
    } else if (rMetadata.relations && rMetadata.relations[l]) {
      return _.startsWith(rMetadata.relations[l], 'one-to-') ? -1 : +1
    }
    return l.localeCompare(r)
  })

  return entities
}

module.exports = getEntitiesOrderedByRelations
