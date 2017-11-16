const _ = require('lodash')
const check = require('check-types')
const { Transform } = require('stream')
const logger = require('winston')

/**
 * Removes metadata from flattened data object stream
 */
class FlattenedMetadataFilter extends Transform {
  /**
   * @constructor
   *
   * @param {boolean} faultTolerant True if to skip errors, false to fail
   * @param {boolean} [abortOnError=] True to abort the stream on error, false to ignore
   */
  constructor (faultTolerant, abortOnError = false) {
    check.assert.boolean(faultTolerant)
    check.assert.boolean(abortOnError)

    super({
      objectMode: true
    })

    this._faultTolerant = faultTolerant
    this._abortOnError = abortOnError
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    try {
      const alteredData = _.mapValues(chunk, (value) => {
        if (!this._faultTolerant && (!value.data || !value.metadata)) {
          throw new Error('Invalid object format')
        }
        return value.data || value
      })
      callback(null, alteredData)
    } catch (error) {
      logger.log('error', 'Error in FlattenedMetadataFilter:', error)
      callback(this._abortOnError ? error : null, null)
    }
  }
}

module.exports = FlattenedMetadataFilter
