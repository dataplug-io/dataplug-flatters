/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const Promise = require('bluebird')
const { FlattenedMetadataFilter } = require('../lib')

describe('FlattenedMetadataFilter', () => {
  it('tolerantly removes data', (done) => {
    const filter = new FlattenedMetadataFilter(true)
    new Promise((resolve, reject) => {
      let data = []
      filter
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => { data.push(chunk) })
    })
      .should.eventually.be.deep.equal([{
        entity1: [{}],
        entity2: [{}]
      }])
      .notify(done)

    filter.write({
      entity1: {
        metadata: {},
        data: [{}]
      },
      entity2: [{}]
    })
    filter.end()
  })

  it('throws intolerantly on invalid data', (done) => {
    const filter = new FlattenedMetadataFilter(false, true)
    new Promise((resolve, reject) => {
      let data = []
      filter
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => { data.push(chunk) })
    })
      .should.eventually.be.rejectedWith(/Invalid object format/)
      .notify(done)

    filter.write({
      entity1: {
        metadata: {},
        data: [{}]
      },
      entity2: [{}]
    })
    filter.end()
  })
})
