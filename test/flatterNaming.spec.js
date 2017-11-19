/* eslint-env node, mocha */
require('chai')
  .should()
const logger = require('winston')
const { FlatterNaming } = require('../lib')

logger.clear()

describe('FlatterNaming', () => {
  describe('#constructor()', () => {
    it('has default value for \'pathSeparator\'', () => {
      new FlatterNaming().pathSeparator
        .should.be.equal(FlatterNaming.DEFAULT_OPTIONS.pathSeparator)
    })

    it('has default value for \'generatedFieldPrefix\'', () => {
      new FlatterNaming().generatedFieldPrefix
        .should.be.equal(FlatterNaming.DEFAULT_OPTIONS.generatedFieldPrefix)
    })

    it('has default value for \'placeholder\'', () => {
      new FlatterNaming().placeholder
        .should.be.equal(FlatterNaming.DEFAULT_OPTIONS.placeholder)
    })

    it('has default value for \'scopeSpecifier\'', () => {
      new FlatterNaming().scopeSpecifier
        .should.be.equal(FlatterNaming.DEFAULT_OPTIONS.scopeSpecifier)
    })
  })

  describe('#getEntityFqName()', () => {
    it('returns empty entity name if no components specified', () => {
      new FlatterNaming().getEntityFqName()
        .should.be.equal('')
    })

    it('returns entity name if 1 components specified', () => {
      new FlatterNaming().getEntityFqName('entity')
        .should.be.equal('entity')
    })

    it('returns entity name if 2 components specified', () => {
      new FlatterNaming().getEntityFqName('entity', 'subentity')
        .should.be.equal(`entity${FlatterNaming.DEFAULT_OPTIONS.pathSeparator}subentity`)
    })
  })
})
