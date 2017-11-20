/* eslint-env node, mocha */
require('chai')
  .should()
const Ajv = require('ajv')
const logger = require('winston')
const { SchemaFlatter } = require('../lib')

logger.clear()

describe('SchemaFlatter', () => {
  it('flattens basic schema', () => {
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.have.property('collection').that.is.deep.equal({
        fields: {
          booleanProperty: {
            type: 'boolean'
          },
          enumProperty: {
            enum: [
              'option1',
              'option2'
            ],
            type: 'enum'
          },
          integerProperty: {
            type: 'integer'
          },
          stringProperty: {
            type: 'string'
          },
          objectProperty: {
            type: 'json'
          }
        },
        origin: '#'
      })
  })

  it('flattens basic schema with defaults', () => {
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.have.property('collection').that.is.deep.equal({
        fields: {
          booleanProperty: {
            type: 'boolean',
            default: false
          },
          enumProperty: {
            enum: [
              'option1',
              'option2'
            ],
            type: 'enum',
            default: 'option1'
          },
          integerProperty: {
            type: 'integer',
            default: 0
          },
          stringProperty: {
            type: 'string',
            default: 'value'
          },
          objectProperty: {
            type: 'json',
            default: {}
          }
        },
        origin: '#'
      })
  })

  it('flattens basic schema with nullables', () => {
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.have.property('collection').that.is.deep.equal({
        fields: {
          booleanProperty: {
            type: 'boolean',
            nullable: true
          },
          enumProperty: {
            enum: [
              'option1',
              'option2'
            ],
            type: 'enum',
            nullable: true
          },
          integerProperty: {
            type: 'integer',
            nullable: true
          },
          stringProperty: {
            type: 'string',
            nullable: true
          },
          objectProperty: {
            type: 'json',
            nullable: true
          }
        },
        origin: '#'
      })
  })

  it('flattens basic schema with basic arrays', () => {
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            identityProperty: {
              type: 'integer',
              identity: true
            },
            booleanProperty: {
              type: 'boolean[]'
            },
            integerProperty: {
              type: 'integer[]'
            },
            stringProperty: {
              type: 'string[]'
            },
            enumProperty: {
              type: 'enum[]',
              enum: ['option1', 'option2']
            },
            objectProperty: {
              type: 'json[]'
            }
          },
          origin: '#'
        }
      })
  })

  it('flattens schema with nullable complex property', () => {
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          origin: '#',
          relations: {
            'collection/complex': 'one-to-one'
          }
        },
        'collection/complex': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 1,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection',
                field: 'id'
              },
              type: 'integer'
            },
            property: {
              type: 'string'
            }
          },
          origin: '#/properties/complex'
        }
      })
  })

  it('flattens schema with basic array', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        id: {
          type: 'integer'
        },
        array: {
          type: 'array',
          items: {
            type: 'integer'
          }
        }
      },
      required: ['id']
    }
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            },
            array: {
              type: 'integer[]'
            }
          },
          origin: '#'
        }
      })
  })

  it('flattens schema with basic array via ref', () => {
    const jsonSchema = {
      type: 'object',
      definitions: {
        item: {
          type: 'integer'
        }
      },
      properties: {
        id: {
          type: 'integer'
        },
        array: {
          type: 'array',
          items: {
            $ref: '#/definitions/item'
          }
        }
      },
      required: ['id']
    }
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            },
            array: {
              type: 'integer[]'
            }
          },
          origin: '#'
        }
      })
  })

  it('flattens schema with basic nullable array', () => {
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            },
            array: {
              type: 'integer[]',
              nullable: true
            }
          },
          origin: '#'
        }
      })
  })

  it('flattens schema with complex array', () => {
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
              otherId: {
                type: 'integer'
              },
              value: {
                type: 'string'
              }
            },
            required: ['otherId']
          }
        }
      },
      required: ['id']
    }
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          origin: '#',
          relations: {
            'collection/array[@]': 'one-to-many'
          }
        },
        'collection/array[@]': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 2,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection',
                field: 'id'
              },
              type: 'integer'
            },
            otherId: {
              identity: true,
              type: 'integer'
            },
            value: {
              type: 'string'
            }
          },
          origin: '#/properties/array/items'
        }
      })
  })

  it('flattens schema with complex array via $ref', () => {
    const jsonSchema = {
      type: 'object',
      definitions: {
        item: {
          type: 'object',
          properties: {
            otherId: {
              type: 'integer'
            },
            value: {
              type: 'string'
            }
          },
          required: ['otherId']
        }
      },
      properties: {
        id: {
          type: 'integer'
        },
        array: {
          type: 'array',
          items: {
            $ref: '#/definitions/item'
          }
        }
      },
      required: ['id']
    }
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          origin: '#',
          relations: {
            'collection/item': 'one-to-many'
          }
        },
        'collection/item': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 2,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection',
                field: 'id'
              },
              type: 'integer'
            },
            otherId: {
              identity: true,
              type: 'integer'
            },
            value: {
              type: 'string'
            }
          },
          origin: '#/definitions/item'
        }
      })
  })

  it('throws when flattens schema with tuple-array', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        id: {
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
      required: ['id']
    };
    (() => new SchemaFlatter().flatten(jsonSchema, 'collection'))
      .should.throw(/tuple array/)
  })

  it('throws when flattens complex schema without IDs', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        id: {
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
      }
    };
    (() => new SchemaFlatter().flatten(jsonSchema, 'collection'))
      .should.throw(/not identifiable/)
  })

  it('flattens complex schema', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        id: {
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
      required: ['id']
    }
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          relations: {
            'collection/complexObject': 'one-to-one'
          },
          origin: '#'
        },
        'collection/complexObject': {
          fields: {
            '$collection~id': {
              identity: true,
              type: 'integer',
              reference: {
                entity: 'collection',
                field: 'id',
                depth: 1
              },
              relation: {
                entity: 'collection',
                field: 'id'
              }
            },
            otherSimpleProperty: {
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject'
        }
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          origin: '#',
          relations: {
            'collection/complexObject': 'one-to-one'
          }
        },
        'collection/complexObject': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 1,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection',
                field: 'id'
              },
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject',
          relations: {
            'collection/complexObject[@0]': 'one-to-many'
          }
        },
        'collection/complexObject[@0]': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 2,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection/complexObject',
                field: '$collection~id'
              },
              type: 'integer'
            },
            $property: {
              identity: true,
              type: 'string',
              reference: {
                fieldName: true
              }
            },
            $value: {
              nullable: true,
              type: 'json',
              reference: {
                field: ''
              }
            }
          },
          origin: '#/properties/complexObject/additionalProperties'
        }
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          origin: '#',
          relations: {
            'collection/complexObject': 'one-to-one'
          }
        },
        'collection/complexObject': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 1,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection',
                field: 'id'
              },
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject',
          relations: {
            'collection/complexObject[@0]': 'one-to-many'
          }
        },
        'collection/complexObject[@0]': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 2,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection/complexObject',
                field: '$collection~id'
              },
              type: 'integer'
            },
            $property: {
              identity: true,
              type: 'string',
              reference: {
                fieldName: true
              }
            },
            $value: {
              type: 'integer',
              reference: {
                field: ''
              }
            }
          },
          origin: '#/properties/complexObject/additionalProperties'
        }
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          origin: '#',
          relations: {
            'collection/complexObject': 'one-to-one'
          }
        },
        'collection/complexObject': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 1,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection',
                field: 'id'
              },
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject',
          relations: {
            'collection/complexObject[@0]': 'one-to-many'
          }
        },
        'collection/complexObject[@0]': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 2,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection/complexObject',
                field: '$collection~id'
              },
              type: 'integer'
            },
            $property: {
              identity: true,
              type: 'string',
              reference: {
                fieldName: true
              }
            },
            otherValue: {
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject/additionalProperties'
        }
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          origin: '#',
          relations: {
            'collection/complexObject': 'one-to-one'
          }
        },
        'collection/complexObject': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 1,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection',
                field: 'id'
              },
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject',
          relations: {
            'collection/complexObject[@0]': 'one-to-many'
          }
        },
        'collection/complexObject[@0]': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 2,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection/complexObject',
                field: '$collection~id'
              },
              type: 'integer'
            },
            $property: {
              identity: true,
              type: 'string',
              reference: {
                fieldName: true
              }
            },
            $value: {
              type: 'integer',
              reference: {
                field: ''
              }
            }
          },
          origin: '#/properties/complexObject/patternProperties/^.*$'
        }
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
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          origin: '#',
          relations: {
            'collection/complexObject': 'one-to-one'
          }
        },
        'collection/complexObject': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 1,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection',
                field: 'id'
              },
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject',
          relations: {
            'collection/complexObject[@0]': 'one-to-many'
          }
        },
        'collection/complexObject[@0]': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 2,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection/complexObject',
                field: '$collection~id'
              },
              type: 'integer'
            },
            $property: {
              identity: true,
              type: 'string',
              reference: {
                fieldName: true
              }
            },
            otherValue: {
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject/patternProperties/^.*$'
        }
      })
  })

  // TODO: support tree-like schemas via many-to-many relations, which are not supported at the moment
  // using an entity and a relation entity
  it('throws on flattening tree-like schema', () => {
    const jsonSchema = {
      type: 'object',
      definitions: {
        node: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            children: {
              type: 'array',
              items: {
                $ref: '#/definitions/node'
              }
            }
          },
          required: ['id']
        }
      },
      properties: {
        treeId: {
          type: 'integer'
        },
        root: {
          $ref: '#/definitions/node'
        }
      },
      required: ['treeId']
    };
    (() => new SchemaFlatter().flatten(jsonSchema, 'collection'))
      .should.throw(/relation to itself/)
  })
  // it('flattens tree-like schema', () => {
  //   const jsonSchema = {
  //     type: 'object',
  //     definitions: {
  //       node: {
  //         type: 'object',
  //         properties: {
  //           id: {
  //             type: 'integer'
  //           },
  //           children: {
  //             type: 'array',
  //             items: {
  //               $ref: '#/definitions/node'
  //             }
  //           }
  //         },
  //         required: ['id']
  //       }
  //     },
  //     properties: {
  //       treeId: {
  //         type: 'integer'
  //       },
  //       root: {
  //         $ref: '#/definitions/node'
  //       }
  //     },
  //     required: ['treeId']
  //   }
  //   new SchemaFlatter().flatten(jsonSchema, 'collection')
  //     .should.be.deep.equal({
  //       collection: {
  //         fields: {
  //           treeId: {
  //             identity: true,
  //             type: 'integer'
  //           }
  //         },
  //         relations: [
  //           'collection/collection/node'
  //         ]
  //       },
  //       'collection/node': {
  //         fields: {
  //           '$FID:id$collection/node': { // this?
  //             identity: true,
  //             referencedEntity: 'collection/node',
  //             referencedEntityField: 'id',
  //             type: 'integer'
  //           },
  //           id: {
  //             identity: true,
  //             type: 'integer'
  //           }
  //         },
  //         relations: [
  //           'collection/node',
  //           'collection'
  //         ]
  //       }
  //     })
  // })

  it('flattens schema with deeply-nested entities', () => {
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
                anotherComplexObject: {
                  type: 'object',
                  properties: {
                    otherId: {
                      type: 'integer'
                    },
                    otherValue: {
                      type: 'integer'
                    }
                  },
                  required: ['otherId']
                }
              }
            }
          }
        }
      },
      required: ['id']
    }
    new SchemaFlatter().flatten(jsonSchema, 'collection')
      .should.be.deep.equal({
        collection: {
          fields: {
            id: {
              identity: true,
              type: 'integer'
            }
          },
          origin: '#',
          relations: {
            'collection/complexObject': 'one-to-one'
          }
        },
        'collection/complexObject': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 1,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection',
                field: 'id'
              },
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject',
          relations: {
            'collection/complexObject[@0]': 'one-to-many'
          }
        },
        'collection/complexObject[@0]': {
          fields: {
            '$collection~id': {
              identity: true,
              reference: {
                depth: 2,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection/complexObject',
                field: '$collection~id'
              },
              type: 'integer'
            },
            $property: {
              identity: true,
              type: 'string',
              reference: {
                fieldName: true
              }
            }
          },
          origin: '#/properties/complexObject/patternProperties/^.*$',
          relations: {
            'collection/complexObject[@0]/anotherComplexObject': 'one-to-one'
          }
        },
        'collection/complexObject[@0]/anotherComplexObject': {
          fields: {
            '$collection/complexObject[@0]~$property': {
              identity: true,
              reference: {
                depth: 1,
                entity: 'collection/complexObject[@0]',
                fieldName: true
              },
              relation: {
                entity: 'collection/complexObject[@0]',
                field: '$property'
              },
              type: 'string'
            },
            '$collection~id': {
              identity: true,
              reference: {
                depth: 3,
                entity: 'collection',
                field: 'id'
              },
              relation: {
                entity: 'collection/complexObject[@0]',
                field: '$collection~id'
              },
              type: 'integer'
            },
            otherId: {
              identity: true,
              type: 'integer'
            },
            otherValue: {
              type: 'integer'
            }
          },
          origin: '#/properties/complexObject/patternProperties/^.*$/properties/anotherComplexObject'
        }
      })
  })
})

describe('#toJsonSchema()', () => {
  it('converts simple entity to JSON schema', () => {
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
    const flattenedSchema = new SchemaFlatter().flatten(jsonSchema, 'collection')
    const flattenedJsonSchema = SchemaFlatter.toJsonSchema(flattenedSchema)
    new Ajv().compile(flattenedJsonSchema)
    flattenedJsonSchema
      .should.be.deep.equal({
        'definitions': {
          collection: {
            type: 'object',
            'properties': {
              'booleanProperty': {
                type: ['boolean']
              },
              'enumProperty': {
                'enum': [
                  'option1',
                  'option2'
                ]
              },
              'integerProperty': {
                type: ['integer']
              },
              'objectProperty': {
                type: ['object']
              },
              'stringProperty': {
                type: ['string']
              }
            }
          }
        },
        'properties': {
          collection: {
            'items': {
              '$ref': '#/definitions/collection'
            },
            type: 'array'
          }
        },
        type: 'object'
      })
  })

  it('works on complex schema', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        id: {
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
      required: ['id']
    }
    const flattenedSchema = new SchemaFlatter().flatten(jsonSchema, 'collection')
    const flattenedJsonSchema = SchemaFlatter.toJsonSchema(flattenedSchema)
    new Ajv().compile(flattenedJsonSchema)
    flattenedJsonSchema
      .should.be.deep.equal({
        definitions: {
          collection: {
            properties: {
              id: {
                type: ['integer']
              }
            },
            required: [
              'id'
            ],
            type: 'object'
          },
          'collection/complexObject': {
            properties: {
              '$collection~id': {
                type: ['integer']
              },
              otherSimpleProperty: {
                type: ['integer']
              }
            },
            required: [
              '$collection~id'
            ],
            type: 'object'
          }
        },
        properties: {
          collection: {
            items: {
              $ref: '#/definitions/collection'
            },
            type: 'array'
          },
          'collection/complexObject': {
            items: {
              $ref: '#/definitions/collection~1complexObject'
            },
            type: 'array'
          }
        },
        type: 'object'
      })
  })
})
