const _ = require('lodash')
const check = require('check-types')
const Ajv = require('ajv')
const { JsonUtils } = require('@dataplug/dataplug')
const FlatterNaming = require('./flatterNaming')
const SchemaFlatter = require('./schemaFlatter')

/**
 * Flattens data
 */
class DataFlatter {
  /**
   * @constructor
   * @param {Object} jsonSchema JSON schema of the data to flatten
   * @param {string} collectionName Collection name
   * @param {FlatterNaming~Options} [namingOptions=undefined] Naming options
   */
  constructor (jsonSchema, collectionName, namingOptions = undefined) {
    check.assert.object(jsonSchema)
    check.assert.nonEmptyString(collectionName)

    this._jsonSchema = _.cloneDeep(jsonSchema)
    this._collectionName = collectionName
    this._naming = new FlatterNaming(namingOptions)

    this._flattenedEntities = this._prepareSchema()

    const ajv = new Ajv({
      allErrors: true,
      useDefaults: true
    })
    ajv.addKeyword('flatten', {
      valid: true,
      validate: (...args) => {
        this._collectData(...args)
      },
      metaSchema: {
        type: 'object',
        properties: {
          entity: {
            type: 'string'
          },
          fields: {
            type: ['object', 'null'],
            additionalProperties: {
              depth: {
                type: 'integer'
              },
              field: {
                type: 'string'
              },
              fieldName: {
                type: 'boolean'
              }
            }
          }
        },
        additionalItems: false,
        required: ['entity']
      }
    })
    this._dataCollector = ajv.compile(this._jsonSchema)
    this._flattenedData = null
  }

  /**
   * Prepares schema
   *
   * @returns {Object} Flattened schema
   */
  _prepareSchema () {
    const schemaFlatter = new SchemaFlatter(this._naming.options)
    const flattenedSchema = schemaFlatter.flatten(this._jsonSchema, this._collectionName)
    _.forOwn(flattenedSchema, (entity, entityFqName) => {
      const originPath = JsonUtils.pointerToPath(entity.origin)

      let flattenDeclaration = {
        entity: entityFqName
      }
      if (entity.fields) {
        flattenDeclaration.fields = {}
        _.forOwn(entity.fields, (field, name) => {
          let fieldDeclaration = {}
          if (field.reference !== undefined) {
            fieldDeclaration.reference = {
              depth: field.reference.depth
            }
            if (field.reference.field !== undefined) {
              fieldDeclaration.reference.field = field.reference.field
            }
            if (field.reference.fieldName !== undefined) {
              fieldDeclaration.reference.fieldName = field.reference.fieldName
            }
          }
          if (field.nullable !== undefined) {
            fieldDeclaration.nullable = field.nullable
          }
          if (field.default !== undefined) {
            fieldDeclaration.default = field.default
          }
          flattenDeclaration.fields[name] = fieldDeclaration
        })
      }
      _.set(this._jsonSchema, originPath ? `${originPath}.flatten` : 'flatten', flattenDeclaration)
    })
    return flattenedSchema
  }

  /**
   * Flattens the data
   *
   * @param {} data Data to flatten
   * @param {boolean} [includeMetadata=false] True if metadata should be included into data
   */
  flatten (data, includeMetadata = false) {
    check.assert.object(data)
    check.assert.boolean(includeMetadata)

    // Collect flattened data
    this._flattenedData = {}
    if (!this._dataCollector(data)) {
      throw new Error('Invalid data: ' + JSON.stringify(this._dataCollector.errors))
    }
    let flattenedData = this._flattenedData
    this._flattenedData = null

    // Include metadata into the data, if requested
    if (includeMetadata) {
      flattenedData = _.mapValues(flattenedData, (value, key) => {
        return {
          data: value,
          metadata: this._flattenedEntities[key]
        }
      })
    }

    return flattenedData
  }

  /**
   * Collects data
   *
   * @param {Object} flattenDeclaration Flatten declaration
   * @param {Object} data Data
   * @param {Object} dataSchema Data schema
   * @param {string} dataPath Data path
   * @param {Object} dataObject Data object
   * @param {string} propertyName The property name in the data object
   * @param {Object} rootData The root data
   */
  _collectData (flattenDeclaration, data, dataSchema, dataPath, dataObject, propertyName, rootData) {
    if (data === null) {
      return
    }

    let flattenedObject = {}
    _.forOwn(flattenDeclaration.fields, (fieldDeclaration, name) => {
      let value
      if (!fieldDeclaration.reference) {
        // There's no reference at all, use value of the field by its name
        value = data[name]
      } else {
        // Move upwards in data according to the depth specified
        const dataPointer = JsonUtils.pathToPointer(dataPath)
        const inheritedDataPointer = !fieldDeclaration.reference.depth ? dataPointer : dataPointer
          .split('/')
          .slice(0, -fieldDeclaration.reference.depth)
          .join('/')
        if (fieldDeclaration.reference.fieldName) {
          value = inheritedDataPointer.match(/([^/]+)$/g)[0]
        } else {
          const inheritedDataPath = JsonUtils.pointerToPath(inheritedDataPointer)
          const propertyPathComponents = []
          if (inheritedDataPath && inheritedDataPath.length > 0) {
            propertyPathComponents.push(inheritedDataPath)
          }
          if (fieldDeclaration.reference.field) {
            propertyPathComponents.push(fieldDeclaration.reference.field)
          }
          const propertyPath = propertyPathComponents.join('.')
          value = _.get(rootData, propertyPath)
          if (value === undefined) {
            throw new Error(`Failed to resolve value at '${propertyPath}' for '${dataPath}' via ${JSON.stringify(fieldDeclaration)}`)
          }
        }
      }
      if (value === undefined && fieldDeclaration.default !== undefined) {
        value = fieldDeclaration.default
      }
      if (value === undefined && fieldDeclaration.nullable) {
        value = null
      }
      if (value === undefined) {
        return
      }
      flattenedObject[name] = value
    })

    let entityData = this._flattenedData[flattenDeclaration.entity]
    if (!entityData) {
      entityData = this._flattenedData[flattenDeclaration.entity] = []
    }
    entityData.push(flattenedObject)
  }
}

module.exports = DataFlatter
