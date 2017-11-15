/* eslint-env node, mocha */
require('chai')
  .should()
const { DataFlatter } = require('../lib')

describe('DataFlatter', () => {
  describe('#constructor()', () => {
    it('throws for schema with tuple-aray', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          simpleProperty: {
            type: 'integer'
          },
          array: {
            type: 'array',
            items: [{
              type: 'integer'
            }, {
              type: 'string'
            }]
          }
        },
        required: ['simpleProperty']
      };
      (() => new DataFlatter(jsonSchema, 'collection'))
        .should.throw(/tuple array/)
    })
  })

  describe('#flatten()', () => {
    it('flattens basic data', () => {
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
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [data]
        })
    })

    it('flattens basic data with defaults', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          booleanProperty: {
            type: 'boolean',
            default: true
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
      const data = {}
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            booleanProperty: true,
            integerProperty: 0,
            stringProperty: 'value',
            enumProperty: 'option1',
            objectProperty: {}
          }]
        })
    })

    it('flattens basic data with nullables', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          booleanProperty: {
            type: ['boolean', 'null']
          },
          integerProperty: {
            type: ['integer', 'null']
          },
          stringProperty: {
            type: ['string', 'null']
          },
          enumProperty: {
            enum: ['option1', 'option2', null]
          },
          objectProperty: {
            type: ['object', 'null']
          }
        }
      }
      const data = {}
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            booleanProperty: null,
            integerProperty: null,
            stringProperty: null,
            enumProperty: null,
            objectProperty: null
          }]
        })
    })

    it('flattens basic data with basic arrays', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          identityProperty: {
            type: 'integer'
          },
          booleanProperty: {
            type: 'array',
            items: {
              type: 'boolean'
            }
          },
          integerProperty: {
            type: 'array',
            items: {
              type: 'integer'
            }
          },
          stringProperty: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          enumProperty: {
            type: 'array',
            items: {
              enum: ['option1', 'option2']
            }
          },
          objectProperty: {
            type: 'array',
            items: {
              type: 'object'
            }
          }
        },
        required: ['identityProperty']
      }
      const data = {
        identityProperty: 42,
        booleanProperty: [true],
        integerProperty: [0],
        stringProperty: ['value'],
        enumProperty: ['option1'],
        objectProperty: [{}]
      }
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            identityProperty: 42
          }],
          'collection/booleanProperty[@]': [{
            '$collection~identityProperty': 42,
            $value: true
          }],
          'collection/integerProperty[@]': [{
            '$collection~identityProperty': 42,
            $value: 0
          }],
          'collection/stringProperty[@]': [{
            '$collection~identityProperty': 42,
            $value: 'value'
          }],
          'collection/enumProperty[@]': [{
            '$collection~identityProperty': 42,
            $value: 'option1'
          }],
          'collection/objectProperty[@]': [{
            '$collection~identityProperty': 42,
            $value: {}
          }]
        })
    })

    it('flattens data with nullable complex property', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'integer'
          },
          complex: {
            type: ['object', 'null'],
            properties: {
              property: {
                type: 'string'
              }
            }
          }
        },
        required: ['id']
      }
      const data = {
        id: 42,
        complex: null
      }
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            id: 42
          }]
        })
    })

    it('flattens data with basic nullable array', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'integer'
          },
          array: {
            type: ['array', 'null'],
            items: {
              type: 'integer'
            }
          }
        },
        required: ['id']
      }
      const data = {
        id: 42,
        array: null
      }
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            id: 42
          }]
        })
    })

    it('flattens data with complex array', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'integer'
          },
          array: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: {
                  type: 'string'
                }
              }
            }
          }
        },
        required: ['id']
      }
      const data = {
        id: 42,
        array: [{ value: 'value' }]
      }
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            id: 42
          }],
          'collection/array[@]': [{
            '$collection~id': 42,
            value: 'value'
          }]
        })
    })

    it('flattens complex data', () => {
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
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            simpleProperty: 0
          }],
          'collection/complexObject': [{
            '$collection~simpleProperty': 0,
            otherSimpleProperty: 0
          }]
        })
    })

    it('flattens complex schema with default additionalProperties', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'integer'
          },
          complexObject: {
            type: 'object',
            additionalProperties: true
          }
        },
        required: ['id']
      }
      const data = {
        id: 42,
        complexObject: {
          booleanProperty: true,
          integerProperty: 0,
          stringProperty: 'value',
          enumProperty: 'option1',
          objectProperty: {}
        }
      }
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            id: 42
          }],
          'collection/complexObject': [{
            '$collection~id': 42
          }],
          'collection/complexObject[@0]': [
            { '$collection~id': 42, $property: 'booleanProperty', $value: true },
            { '$collection~id': 42, $property: 'integerProperty', $value: 0 },
            { '$collection~id': 42, $property: 'stringProperty', $value: 'value' },
            { '$collection~id': 42, $property: 'enumProperty', $value: 'option1' },
            { '$collection~id': 42, $property: 'objectProperty', $value: {} }
          ]
        })
    })

    it('flattens complex schema with basic custom additionalProperties', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'integer'
          },
          complexObject: {
            type: 'object',
            additionalProperties: {
              type: 'integer'
            }
          }
        },
        required: ['id']
      }
      const data = {
        id: 42,
        complexObject: {
          integerProperty0: 0,
          integerProperty1: 1
        }
      }
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            id: 42
          }],
          'collection/complexObject': [{
            '$collection~id': 42
          }],
          'collection/complexObject[@0]': [
            { '$collection~id': 42, $property: 'integerProperty0', $value: 0 },
            { '$collection~id': 42, $property: 'integerProperty1', $value: 1 }
          ]
        })
    })

    it('flattens complex schema with complex custom additionalProperties', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'integer'
          },
          complexObject: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                otherValue: {
                  type: 'integer'
                }
              }
            }
          }
        },
        required: ['id']
      }
      const data = {
        id: 42,
        complexObject: {
          objectProperty0: { otherValue: 0 },
          objectProperty1: { otherValue: 1 }
        }
      }
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            id: 42
          }],
          'collection/complexObject': [{
            '$collection~id': 42
          }],
          'collection/complexObject[@0]': [
            { '$collection~id': 42, $property: 'objectProperty0', otherValue: 0 },
            { '$collection~id': 42, $property: 'objectProperty1', otherValue: 1 }
          ]
        })
    })

    it('flattens complex schema with basic custom patternProperties', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'integer'
          },
          complexObject: {
            type: 'object',
            patternProperties: {
              '^.*$': {
                type: 'integer'
              }
            }
          }
        },
        required: ['id']
      }
      const data = {
        id: 42,
        complexObject: {
          integerProperty0: 0,
          integerProperty1: 1
        }
      }
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            id: 42
          }],
          'collection/complexObject': [{
            '$collection~id': 42
          }],
          'collection/complexObject[@0]': [
            { '$collection~id': 42, $property: 'integerProperty0', $value: 0 },
            { '$collection~id': 42, $property: 'integerProperty1', $value: 1 }
          ]
        })
    })

    it('flattens complex schema with complex custom patternProperties', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'integer'
          },
          complexObject: {
            type: 'object',
            patternProperties: {
              '^.*$': {
                type: 'object',
                properties: {
                  otherValue: {
                    type: 'integer'
                  }
                }
              }
            }
          }
        },
        required: ['id']
      }
      const data = {
        id: 42,
        complexObject: {
          objectProperty0: { otherValue: 0 },
          objectProperty1: { otherValue: 1 }
        }
      }
      new DataFlatter(jsonSchema, 'collection').flatten(data)
        .should.deep.equal({
          collection: [{
            id: 42
          }],
          'collection/complexObject': [{
            '$collection~id': 42
          }],
          'collection/complexObject[@0]': [
            { '$collection~id': 42, $property: 'objectProperty0', otherValue: 0 },
            { '$collection~id': 42, $property: 'objectProperty1', otherValue: 1 }
          ]
        })
    })

    it('includes metadata', () => {
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
      new DataFlatter(jsonSchema, 'collection').flatten(data, true)
        .should.deep.equal({
          collection: {
            data: [{
              simpleProperty: 0
            }],
            metadata: {
              fields: {
                simpleProperty: {
                  identity: true,
                  type: 'integer'
                }
              },
              origin: '#',
              relations: {
                'collection/complexObject': 'one-to-one'
              }
            }
          },
          'collection/complexObject': {
            data: [{
              '$collection~simpleProperty': 0,
              otherSimpleProperty: 0
            }],
            metadata: {
              fields: {
                '$collection~simpleProperty': {
                  identity: true,
                  reference: {
                    depth: 1,
                    entity: 'collection',
                    field: 'simpleProperty'
                  },
                  relation: {
                    entity: 'collection',
                    field: 'simpleProperty'
                  },
                  type: 'integer'
                },
                otherSimpleProperty: {
                  type: 'integer'
                }
              },
              origin: '#/properties/complexObject'
            }
          }
        })
    })

    it('throws on invalid data', () => {
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
        additionalProperties: false,
        required: ['simpleProperty']
      }
      const data = {
        simpleProperty: 0,
        complexObject: {
          otherSimpleProperty: 0
        },
        extraProperty: true
      };
      (() => new DataFlatter(jsonSchema, 'collection').flatten(data))
        .should.throw(/Invalid data/)
    })
  })
})
