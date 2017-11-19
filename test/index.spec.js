/* eslint-env node, mocha */
require('chai')
  .should()
const logger = require('winston')
const dataplugFlatters = require('../lib')

logger.clear()

describe('dataplug-flatters', () => {
  it('has "DataFlatter" class', () => {
    dataplugFlatters
      .should.have.property('DataFlatter')
      .that.is.an('function')
  })

  it('has "FlattenedMetadataFilter" class', () => {
    dataplugFlatters
      .should.have.property('FlattenedMetadataFilter')
      .that.is.an('function')
  })

  it('has "FlattenedTransformStream" class', () => {
    dataplugFlatters
      .should.have.property('FlattenedTransformStream')
      .that.is.an('function')
  })

  it('has "FlatterNaming" class', () => {
    dataplugFlatters
      .should.have.property('FlatterNaming')
      .that.is.an('function')
  })

  it('has "SchemaFlatter" class', () => {
    dataplugFlatters
      .should.have.property('SchemaFlatter')
      .that.is.an('function')
  })

  it('has "StreamFlatter" class', () => {
    dataplugFlatters
      .should.have.property('StreamFlatter')
      .that.is.an('function')
  })
})
