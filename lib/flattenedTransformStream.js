const _ = require('lodash')
const check = require('check-types')
const { Transform } = require('stream')

/**
 * Transforms flattened data object stream
 */
class FlattenedTransformStream extends Transform {
  /**
   * @constructor
   *
   * @param {FlattenedTransformStream~Transform} transformCallback Transform functor
   * @param {SchemaFlatter~Metadata} [metadata=undefined] Metadata
   */
  constructor (transformCallback, metadata = undefined) {
    check.assert.function(transformCallback)
    check.assert.maybe.object(metadata)

    super({
      objectMode: true
    })

    this._transformCallback = transformCallback
    this._metadata = metadata ? _.cloneDeep(metadata) : undefined
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    try {
      _.forOwn(chunk, (entity, entityName) => {
        const metadata = (this._metadata ? this._metadata[entityName] : undefined) || entity.metadata
        if (!metadata) {
          throw new Error(`No metadata for '${entityName}'`)
        }

        const entries = entity.data || entity
        if (!_.isArray(entries)) {
          throw new Error(`Invalid data format of '${entityName}'`)
        }

        const newEntries = []
        _.forEach(entries, (entry) => {
          const newEntry = this._transformCallback(entry, metadata, entityName)
          if (!newEntry) {
            return
          }
          newEntries.push(newEntry)
        })
        if (entity.data) {
          entity.data = newEntries
        } else {
          chunk[entityName] = newEntries
        }
      })
    } catch (error) {
      callback(error, null)
      return
    }
    callback(null, chunk)
  }
}

/**
 * @callback FlattenedTransformStream~Transform
 * @param {} object
 * @param {SchemaFlatter~Entity} metadata Entity metadata
 * @param {string} entity Entity name
 * @returns {} Altered object or falsy if to remove
 */

module.exports = FlattenedTransformStream
