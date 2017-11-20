/* eslint-env node, mocha */
require('chai')
  .should()
const logger = require('winston')
const { getEntitiesOrderedByRelations } = require('../lib')

logger.clear()

describe('getEntitiesOrderedByRelations()', () => {
  it('sorts unrelated entities by names', () => {
    const metadata = {
      entityB: {
        origin: '#/definitions/entityB'
      },
      entity0: {
        origin: '#/definitions/entity0'
      },
      entityA: {
        origin: '#/definitions/entityA'
      },
      entityZ: {
        origin: '#/definitions/entityZ'
      }
    }
    const sortedEntities = getEntitiesOrderedByRelations(metadata)
    sortedEntities.should.be.deep.equal([
      'entity0',
      'entityA',
      'entityB',
      'entityZ'
    ])
  })

  it('sorts related entities in owned-first order', () => {
    const metadata = {
      entityB: {
        origin: '#/definitions/entityB'
      },
      entityZ: {
        origin: '#/definitions/entityZ',
        relations: {
          'entityC': 'one-to-one',
          'entityB': 'one-to-one'
        }
      },
      entityA: {
        origin: '#/definitions/entityA'
      },
      entityC: {
        origin: '#/definitions/entityC',
        relations: {
          'entityA': 'one-to-many'
        }
      },
      entity: {
        origin: '#/definitions/entity'
      }
    }
    const sortedEntities = getEntitiesOrderedByRelations(metadata, false)
    sortedEntities.should.be.deep.equal([
      'entity',
      'entityA',
      'entityB',
      'entityC',
      'entityZ'
    ])
  })

  it('sorts related entities in owner-first order', () => {
    const metadata = {
      entityB: {
        origin: '#/definitions/entityB'
      },
      entityZ: {
        origin: '#/definitions/entityZ'
      },
      entityA: {
        origin: '#/definitions/entityA',
        relations: {
          'entityC': 'one-to-one',
          'entityB': 'one-to-one'
        }
      },
      entityC: {
        origin: '#/definitions/entityC',
        relations: {
          'entityZ': 'one-to-many'
        }
      },
      entity: {
        origin: '#/definitions/entity'
      }
    }
    const sortedEntities = getEntitiesOrderedByRelations(metadata, true)
    sortedEntities.should.be.deep.equal([
      'entity',
      'entityA',
      'entityB',
      'entityC',
      'entityZ'
    ])
  })
})
