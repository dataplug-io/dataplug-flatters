/* eslint-env node, mocha */
require('chai')
  .should()
const Ajv = require('ajv')
const { SchemaFlatter, DataFlatter } = require('../lib')

describe('SchemaFlatter <> DataFlatter compatibility', () => {
  it('works on basic schema and data', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        booleanProperty: {
          type: 'boolean'
        },
        integerProperty: {
          type: 'integer'
        },
        stringProperty: {
          type: 'string'
        },
        enumProperty: {
          enum: ['option1', 'option2']
        },
        objectProperty: {
          type: 'object'
        }
      }
    }
    const data = {
      booleanProperty: true,
      integerProperty: 0,
      stringProperty: 'value',
      enumProperty: 'option1',
      objectProperty: {}
    }
    const validate = new Ajv().compile(new SchemaFlatter().flattenToJsonSchema(jsonSchema, 'collection'))
    validate(new DataFlatter(jsonSchema, 'collection').flatten(data))
      .should.be.equal(true)
  })

  it('works on basic schema with defaults and data', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        booleanProperty: {
          type: 'boolean',
          default: false
        },
        integerProperty: {
          type: 'integer',
          default: 0
        },
        stringProperty: {
          type: 'string',
          default: 'value'
        },
        enumProperty: {
          enum: ['option1', 'option2'],
          default: 'option1'
        },
        objectProperty: {
          type: 'object',
          default: {}
        }
      }
    }
    const data = {
      booleanProperty: undefined,
      integerProperty: undefined,
      stringProperty: undefined,
      enumProperty: undefined,
      objectProperty: undefined
    }
    const validate = new Ajv().compile(new SchemaFlatter().flattenToJsonSchema(jsonSchema, 'collection'))
    validate(new DataFlatter(jsonSchema, 'collection').flatten(data))
      .should.be.equal(true)
  })

  it('works on complex schema and data', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        simpleProperty: {
          type: 'integer'
        },
        complexObject: {
          type: 'object',
          properties: {
            otherSimpleProperty: {
              type: 'integer'
            }
          }
        }
      },
      required: ['simpleProperty']
    }
    const data = {
      simpleProperty: 0,
      complexObject: {
        otherSimpleProperty: 0
      }
    }
    const validate = new Ajv().compile(new SchemaFlatter().flattenToJsonSchema(jsonSchema, 'collection'))
    validate(new DataFlatter(jsonSchema, 'collection').flatten(data))
      .should.be.equal(true)
  })
})
