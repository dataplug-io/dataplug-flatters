/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const _ = require('lodash')
const Promise = require('bluebird')
const logger = require('winston')
const { FlattenedTransformStream } = require('../lib')

logger.clear()

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
    const transformer = new FlattenedTransformStream((object) => false, undefined, true)
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

  it('generates missing metadata', (done) => {
    const generate = (entity) => ({})
    const transformer = new FlattenedTransformStream((object) => false, generate, true)
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
      .should.eventually.be.deep.equal([{
        entity: {
          metadata: {},
          data: []
        }
      }])
      .notify(done)
  })
})
