const check = require('check-types')
const { Transform } = require('stream')
const logger = require('winston')
const DataFlatter = require('./dataFlatter')

/**
 * Flattens the object stream
 */
class StreamFlatter extends Transform {
  /**
   * @constructor
   *
   * @param {Object} jsonSchema JSON schema
   * @param {string} collectionName Collection name
   * @param {boolean} [includeMetadata=false] True if metadata should be included into data
   * @param {FlatterNaming~Options} [namingOptions=undefined] Naming options
   */
  constructor (jsonSchema, collectionName, includeMetadata = false, namingOptions = undefined) {
    check.assert.object(jsonSchema)
    check.assert.nonEmptyString(collectionName)
    check.assert.boolean(includeMetadata)

    super({
      objectMode: true
    })

    this._includeMetadata = includeMetadata
    this._dataFlatter = new DataFlatter(jsonSchema, collectionName, namingOptions)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    try {
      const flattened = this._dataFlatter.flatten(chunk, this._includeMetadata)
      callback(null, flattened)
    } catch (error) {
      logger.log('error', 'Error in StreamFlatter:', error)
      callback(error, null)
    }
  }
}

module.exports = StreamFlatter
