const _ = require('lodash')
const check = require('check-types')
const { Transform } = require('stream')

/**
 * Removes metadata from flattened data object stream
 */
class FlattenedMetadataFilter extends Transform {
  /**
   * @constructor
   *
   * @param {boolean} faultTolerant True if to skip errors, false to fail
   */
  constructor (faultTolerant) {
    check.assert.boolean(faultTolerant)

    super({
      objectMode: true
    })

    this._faultTolerant = faultTolerant
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
      callback(error, null)
    }
  }
}

module.exports = FlattenedMetadataFilter
