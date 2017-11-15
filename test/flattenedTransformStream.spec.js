/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const _ = require('lodash')
const Promise = require('bluebird')
const { FlattenedTransformStream } = require('../lib')

describe('FlattenedTransformStream', () => {
  it('alters data', (done) => {
    const transformer = new FlattenedTransformStream((object) => _.assign({}, object, { property: 'value' }))
    new Promise((resolve, reject) => {
      let data = []
      transformer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => { data.push(chunk) })
    })
      .should.eventually.be.deep.equal([{
        entity: {
          metadata: {},
          data: [{ property: 'value' }]
        }
      }])
      .notify(done)

    transformer.write({
      entity: {
        metadata: {},
        data: [{}]
      }
    })
    transformer.end()
  })

  it('removes data', (done) => {
    const transformer = new FlattenedTransformStream((object) => false)
    new Promise((resolve, reject) => {
      let data = []
      transformer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => { data.push(chunk) })
    })
      .should.eventually.be.deep.equal([{
        entity: {
          metadata: {},
          data: []
        }
      }])
      .notify(done)

    transformer.write({
      entity: {
        metadata: {},
        data: [{}]
      }
    })
    transformer.end()
  })

  it('throws on missing metadata', (done) => {
    const transformer = new FlattenedTransformStream((object) => false)
    new Promise((resolve, reject) => {
      let data = []
      transformer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => { data.push(chunk) })

      transformer.write({
        entity: [{}]
      })
      transformer.end()
    })
      .should.eventually.be.rejectedWith(/No metadata/)
      .notify(done)
  })
})
