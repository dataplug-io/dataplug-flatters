const _ = require('lodash')
const check = require('check-types')
const { Transform } = require('stream')
const logger = require('winston')

/**
 * Transforms flattened data object stream
 */
class FlattenedTransformStream extends Transform {
  /**
   * @constructor
   *
   * @param {FlattenedTransformStream~Transform} transformCallback Transform functor
   * @param {SchemaFlatter~Metadata|function} [metadata=] Metadata to fill, override or extend the metadata from stream
   * @param {boolean} [abortOnError=] True to abort the stream on error, false to ignore
   */
  constructor (transformCallback, metadata = undefined, abortOnError = false) {
    check.assert.function(transformCallback)
    check.assert(check.any([
      check.maybe.object(metadata),
      check.maybe.function(metadata)
    ]))
    check.assert.boolean(abortOnError)

    super({
      objectMode: true
    })

    this._transformCallback = transformCallback
    this._metadata = metadata && !_.isFunction(metadata)
      ? _.cloneDeep(metadata)
      : metadata
    this._abortOnError = abortOnError
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    try {
      _.forOwn(chunk, (entity, entityName) => {
        let metadata
        if (entity) {
          metadata = entity.metadata
        }
        if (this._metadata) {
          metadata = metadata ? _.cloneDeep(metadata) : metadata
          if (_.isFunction(this._metadata)) {
            metadata = this._metadata(metadata)
          } else if (_.isPlainObject(this._metadata[entityName])) {
            metadata = _.assign(metadata || {}, this._metadata[entityName])
          }
        }
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
      callback(null, chunk)
    } catch (error) {
      logger.log('error', 'Error in FlattenedTransformStream:', error)
      callback(this._abortOnError ? error : null, null)
    }
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
