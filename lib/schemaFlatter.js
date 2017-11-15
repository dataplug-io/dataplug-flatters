const _ = require('lodash')
const check = require('check-types')
const { JsonUtils } = require('@dataplug/dataplug')
const FlatterNaming = require('./flatterNaming')

/**
 * Flattens schema into a set of entities with scalar fields
 */
class SchemaFlatter {
  /**
   * @constructor
   * @param {FlatterNaming~Options} [namingOptions=undefined] Naming options
   */
  constructor (namingOptions = undefined) {
    check.assert.maybe.object(namingOptions)

    this._naming = new FlatterNaming(namingOptions)
  }

  /**
   * Flattens specified schema
   *
   * @param {Object} jsonSchema JSON schema
   * @param {string} collectionName Collection name
   * @returns {SchemaFlatter~Metadata} Metadata
   */
  flatten (jsonSchema, collectionName) {
    check.assert.object(jsonSchema)
    check.assert.nonEmptyString(collectionName)

    const context = {
      collectionName,
      entities: {},
      stack: [],
      jsonSchema
    }
    this._flattenEntity(context, collectionName, '#')
    return context.entities
  }

  /**
   * Flattens given definition as entity with specified name
   *
   * @param {SchemaFlatter~Context} context Flattening context
   * @param {string} entityFqName Entity fully-qualified name
   * @param {string} definitionOrigin Pointer to entity JSON definition or custom definition
   * @param {Object} [definitionOverride=] Custom definition that overrides the one from schema
   * @param {Object} [inheritedFields=] Object with inherited fields
   * @returns {SchemaFlatter~Entity} Flattened entity
   */
  _flattenEntity (context, entityFqName, definitionOrigin, definitionOverride = undefined, inheritedFields = undefined) {
    check.assert.object(context)
    check.nonEmptyString(entityFqName)
    check.assert.nonEmptyString(definitionOrigin)
    check.assert.maybe.object(definitionOverride)
    check.assert.maybe.object(inheritedFields)

    let entity = context.entities[entityFqName]

    // If this entity was already flattened, don't flatten it again
    if (entity && entity.origin === definitionOrigin) {
      return entity
    }

    // Check if this entity was not defined elsewhere
    if (entity && entity.origin !== definitionOrigin) {
      throw new Error(`'${entityFqName}' has duplicate definition at '${definitionOrigin}', previously seen at '${entity.origin}'`)
    }

    const definition = definitionOverride || JsonUtils.resolveReference(definitionOrigin, context.jsonSchema)

    const types = _.isArray(definition.type)
      ? definition.type
      : [definition.type]
    if (!types.includes('object')) {
      throw new Error(`'${entityFqName}' definition must have an 'object' type`)
    }

    const unsupportedTypes = _.without(types, 'object', 'null').join(', ')
    if (unsupportedTypes.length > 0) {
      throw new Error(`'${entityFqName}' definition contains unsupported type(s) ${unsupportedTypes}`)
    }

    const entityContext = {
      definitionOrigin,
      objectProperties: [],
      arrayProperties: [],
      hasAdditionalProperties:
        definition.additionalProperties &&
        definition.additionalProperties !== false,
      hasPatternProperties:
        definition.patternProperties &&
        _.size(definition.patternProperties) > 0,
      usedVariadicPropertiesIndices: 0
    }

    entity = context.entities[entityFqName] = {
      origin: definitionOrigin
    }
    context.stack.push(entity)

    // Process inherited fields references
    entityContext.inheritedFields = inheritedFields ? _.cloneDeep(inheritedFields) : {}
    _.forOwn(entityContext.inheritedFields, (inheritedField) => {
      inheritedField.reference = inheritedField.reference || {}
      inheritedField.reference.depth = (inheritedField.reference.depth || 0) + 1
    })

    // Inherited fields are added as fields
    entityContext.fields = _.cloneDeep(entityContext.inheritedFields)
    entityContext.relations = {}

    // For all sub-entities, re-relate to this entity
    _.forOwn(entityContext.inheritedFields, (inheritedField, inheritedFieldName) => {
      inheritedField.relation.entity = entityFqName
      inheritedField.relation.field = inheritedFieldName
    })

    // Process defined properties
    if (definition.properties) {
      this._flattenEntityDefinedProperties(context, entityContext, entityFqName, definition)
    }

    // Handle object-'properties' as one-to-one relations
    if (entityContext.objectProperties.length) {
      this._flattenEntityDefinedObjectProperties(context, entityContext, entityFqName, definition)
    }

    // Handle array-'properties' as one-to-many relations
    if (entityContext.arrayProperties.length) {
      this._flattenEntityDefinedArrayProperties(context, entityContext, entityFqName, definition)
    }

    // Handle subentities from 'additionalProperties' as one-to-many relations
    if (entityContext.hasAdditionalProperties) {
      this._flattenEntityAdditionalProperties(context, entityContext, entityFqName, definition)
    }

    // Handle subentities from 'patternProperties' as one-to-many relations
    if (entityContext.hasPatternProperties) {
      this._flattenEntityPatternProperties(context, entityContext, entityFqName, definition)
    }

    if (_.size(entityContext.fields) > 0) {
      entity.fields = entityContext.fields
    }
    if (_.size(entityContext.relations) > 0) {
      entity.relations = entityContext.relations
    }

    if (context.stack.pop() !== entity) {
      throw Error('Stack corrupted during flattening')
    }

    return entity
  }

  /**
   * Flattens entity defined properties
   *
   * @param {SchemaFlatter~Context} context Flattening context
   * @param {SchemaFlatter~EntityContext} entityContext Flattening enity ontext
   * @param {string} entityFqName
   * @param {object} definition
   */
  _flattenEntityDefinedProperties (context, entityContext, entityFqName, definition) {
    check.assert.object(context)
    check.assert.object(entityContext)
    check.assert.nonEmptyString(entityFqName)
    check.assert.object(definition)

    _.forOwn(definition.properties, (propertyDefinition, propertyName) => {
      if (propertyDefinition.$ref) {
        propertyDefinition = JsonUtils.resolveReference(propertyDefinition.$ref, context.jsonSchema)
      }

      const types = _.isArray(propertyDefinition.type)
        ? propertyDefinition.type
        : (propertyDefinition.type ? [propertyDefinition.type] : [])
      const validTypes = _.without(types, 'null')
      if (validTypes.length > 1) {
        throw new Error(`Not supported: '${propertyName}' of '${entityFqName}' has multiple types`)
      }
      if (validTypes.length === 0 && types.length > 0) {
        const unsupportedTypes = types.join(', ')
        throw new Error(`Not supported: '${propertyName}' of '${entityFqName}' has unsupported type(s) ${unsupportedTypes}`)
      }
      const type = _.head(types)
      const enumValues = propertyDefinition.enum || []
      const nullable = types.includes('null') || enumValues.includes(null)

      if (type === 'object') {
        const hasProperties =
          propertyDefinition.properties &&
          _.size(propertyDefinition.properties) > 0
        const hasAdditionalProperties =
          propertyDefinition.additionalProperties &&
          propertyDefinition.additionalProperties !== false
        const hasPatternProperties =
          propertyDefinition.patternProperties &&
          _.size(propertyDefinition.patternProperties) > 0
        if (hasProperties || hasAdditionalProperties || hasPatternProperties) {
          entityContext.objectProperties.push(propertyName)
          return
        }
      } else if (type === 'array') {
        entityContext.arrayProperties.push(propertyName)
        return
      }

      let field = {}
      if (nullable) {
        field.nullable = nullable
      }
      if (propertyDefinition.default !== undefined) {
        field.default = propertyDefinition.default
      }
      if (definition.required && definition.required.includes(propertyName)) {
        field.identity = true
      }
      if (enumValues.length > 0) {
        field.type = 'enum'
        field.enum = nullable ? _.without(enumValues, null) : enumValues
      } else if (type === 'string') {
        if (propertyDefinition.format === 'date-time') {
          field.type = 'datetime'
        } else if (propertyDefinition.format === 'date') {
          field.type = 'date'
        } else if (propertyDefinition.format === 'time') {
          field.type = 'time'
        } else {
          field.type = type
        }
      } else if (type === 'integer') {
        if (propertyDefinition.format === 'timestamp') {
          field.type = 'timestamp'
        } else {
          field.type = type
        }
      } else if (type === 'boolean' || type === 'number') {
        field.type = type
      } else if (type === 'object') {
        field.type = 'json'
      } else {
        throw new Error(`Not supported: '${propertyName}' of '${entityFqName}' has '${type}' type`)
      }

      entityContext.fields[propertyName] = field
      if (definition.required && definition.required.includes(propertyName)) {
        // For sub-entities, add own required property as inherited field
        const inheritedFieldName = this._naming.getInheritedFieldName(entityFqName, propertyName)
        let inheritedField = entityContext.inheritedFields[inheritedFieldName] = _.cloneDeep(field)
        inheritedField.reference = {
          entity: entityFqName,
          field: propertyName
        }
        inheritedField.relation = _.cloneDeep(inheritedField.reference)
      }
    })
  }

  /**
   * Flattens entity defined properties with type 'object'
   *
   * @param {SchemaFlatter~Context} context Flattening context
   * @param {SchemaFlatter~EntityContext} entityContext Flattening entity context
   * @param {string} entityFqName
   * @param {object} definition
   */
  _flattenEntityDefinedObjectProperties (context, entityContext, entityFqName, definition) {
    check.assert.object(context)
    check.assert.object(entityContext)
    check.assert.nonEmptyString(entityFqName)
    check.assert.object(definition)

    if (_.size(entityContext.inheritedFields) === 0) {
      throw new Error(`Instance of '${entityFqName}' is not identifiable and can not have defined object properties`)
    }

    entityContext.objectProperties.forEach((propertyName) => {
      let propertyDefinition = definition.properties[propertyName]
      let propertyDefinitionPointer = `${entityContext.definitionOrigin}/properties/${propertyName}`
      let subentityFqName
      if (propertyDefinition.$ref) {
        propertyDefinitionPointer = propertyDefinition.$ref
        const subentityName = this._naming.pointerToEntityName(propertyDefinition.$ref)
        subentityFqName = this._naming.getEntityFqName(context.collectionName, subentityName)
        propertyDefinition = JsonUtils.resolveReference(propertyDefinition.$ref, context.jsonSchema)
      } else {
        subentityFqName = this._naming.getEntityFqName(entityFqName, propertyName)
      }

      if (entityFqName === subentityFqName) {
        throw new Error(`Not supported: '${entityFqName}' has a relation to itself via '${propertyName}' property`)
      }

      this._flattenEntity(context, subentityFqName, propertyDefinitionPointer, propertyDefinition, entityContext.inheritedFields)
      entityContext.relations[subentityFqName] = 'one-to-one'
    })
  }

  /**
   * Flattens entity defined properties with type 'array'
   *
   * @param {SchemaFlatter~Context} context Flattening context
   * @param {SchemaFlatter~EntityContext} entityContext Flattening entity context
   * @param {string} entityFqName
   * @param {object} definition
   */
  _flattenEntityDefinedArrayProperties (context, entityContext, entityFqName, definition) {
    check.assert.object(context)
    check.assert.object(entityContext)
    check.assert.nonEmptyString(entityFqName)
    check.assert.object(definition)

    if (_.size(entityContext.inheritedFields) === 0) {
      throw new Error(`Instance of '${entityFqName}' is not identifiable and can not have defined array properties`)
    }

    entityContext.arrayProperties.forEach((propertyName) => {
      let propertyDefinition = definition.properties[propertyName]
      if (propertyDefinition.$ref) {
        propertyDefinition = JsonUtils.resolveReference(propertyDefinition.$ref, context.jsonSchema)
      }

      if (_.isArray(propertyDefinition.items)) {
        throw new Error(`Not supported: '${entityFqName}' has a tuple array in '${propertyName}' property`)
      }

      let itemDefinition = propertyDefinition.items
      let itemDefinitionPointer = `${entityContext.definitionOrigin}/properties/${propertyName}/items`
      let subentityFqName
      if (itemDefinition.$ref) {
        itemDefinitionPointer = itemDefinition.$ref
        const subentityName = this._naming.pointerToEntityName(itemDefinition.$ref)
        subentityFqName = this._naming.getEntityFqName(context.collectionName, subentityName)
        itemDefinition = JsonUtils.resolveReference(itemDefinition.$ref, context.jsonSchema)
      } else {
        subentityFqName = this._naming.getEntityFqName(entityFqName, this._naming.getArrayFieldName(propertyName))
      }

      if (entityFqName === subentityFqName) {
        throw new Error(`Not supported: '${entityFqName}' has a relation to itself via '${propertyName}' property`)
      }

      const hasProperties =
        itemDefinition.properties &&
        _.size(itemDefinition.properties) > 0
      const hasAdditionalProperties =
        itemDefinition.additionalProperties &&
        itemDefinition.additionalProperties !== false
      const hasPatternProperties =
        itemDefinition.patternProperties &&
        _.size(itemDefinition.patternProperties) > 0
      const isItemDefinitionGenerated = !hasProperties && !hasAdditionalProperties && !hasPatternProperties
      if (isItemDefinitionGenerated) {
        itemDefinition = this._generateArrayItemDefinition(itemDefinition.type, itemDefinition.enum)
      }

      // Arrays have extra depth level for referencing due to index
      const inheritedFields = _.mapValues(entityContext.inheritedFields, (inheritedField) => {
        inheritedField = _.cloneDeep(inheritedField)
        inheritedField.reference = inheritedField.reference || {}
        inheritedField.reference.depth = (inheritedField.reference.depth || 0) + 1
        return inheritedField
      })
      const subEntity = this._flattenEntity(context, subentityFqName, itemDefinitionPointer, itemDefinition, inheritedFields)
      if (isItemDefinitionGenerated) {
        subEntity.fields[this._naming.getArrayItemValueFieldName()].reference = {
          field: ''
        }
      }
      entityContext.relations[subentityFqName] = 'one-to-many'
    })
  }

  /**
   * Flattens entity additional properties
   *
   * @param {SchemaFlatter~Context} context Flattening context
   * @param {SchemaFlatter~EntityContext} entityContext Flattening entity context
   * @param {string} entityFqName
   * @param {object} definition
   */
  _flattenEntityAdditionalProperties (context, entityContext, entityFqName, definition) {
    check.assert.object(context)
    check.assert.object(entityContext)
    check.assert.nonEmptyString(entityFqName)
    check.assert.object(definition)

    if (_.size(entityContext.inheritedFields) === 0) {
      throw new Error(`Instance of '${entityFqName}' is not identifiable and can not have additional properties`)
    }

    let propertyDefinition = definition.additionalProperties
    let propertyDefinitionPointer = `${entityContext.definitionOrigin}/additionalProperties`

    let subentityFqName
    if (propertyDefinition.$ref) {
      propertyDefinitionPointer = propertyDefinition.$ref
      const subentityName = this._naming.pointerToEntityName(propertyDefinition.$ref)
      subentityFqName = this._naming.getEntityFqName(context.collectionName, subentityName)
      propertyDefinition = JsonUtils.resolveReference(propertyDefinition.$ref, context.jsonSchema)
    } else {
      subentityFqName = this._naming.getVariadicPropertiesEntityFqName(entityFqName, entityContext.usedVariadicPropertiesIndices++)
    }

    if (entityFqName === subentityFqName) {
      throw new Error(`Not supported: '${entityFqName}' has a relation to itself via variadic property`)
    }

    let isPropertyDefinitionValueGenerated = false
    if (propertyDefinition === true) {
      propertyDefinition = this._generateVariadicPropertiesDefinition()
      isPropertyDefinitionValueGenerated = true
    } else {
      const hasProperties =
        propertyDefinition.properties &&
        _.size(propertyDefinition.properties) > 0
      const hasAdditionalProperties =
        propertyDefinition.additionalProperties &&
        propertyDefinition.additionalProperties !== false
      const hasPatternProperties =
        propertyDefinition.patternProperties &&
        _.size(propertyDefinition.patternProperties) > 0
      if (!hasProperties && !hasAdditionalProperties && !hasPatternProperties) {
        propertyDefinition = this._generateVariadicPropertiesDefinition(propertyDefinition.type, propertyDefinition.enum)
        isPropertyDefinitionValueGenerated = true
      } else {
        propertyDefinition = _.cloneDeep(propertyDefinition)
        propertyDefinition.properties = propertyDefinition.properties || {}
        propertyDefinition.required = propertyDefinition.required || []

        const key = this._naming.getVariadicPropertiesKeyFieldName()
        propertyDefinition.properties[key] = {
          type: 'string'
        }
        propertyDefinition.required.push(key)
      }
    }

    const subEntity = this._flattenEntity(context, subentityFqName, propertyDefinitionPointer, propertyDefinition, entityContext.inheritedFields)
    subEntity.fields[this._naming.getVariadicPropertiesKeyFieldName()].reference = {
      fieldName: true
    }
    if (isPropertyDefinitionValueGenerated) {
      subEntity.fields[this._naming.getVariadicPropertiesValueFieldName()].reference = {
        field: ''
      }
    }
    entityContext.relations[subentityFqName] = 'one-to-many'
  }

  /**
   * Flattens entity pattern properties
   *
   * @param {SchemaFlatter~Context} context Flattening context
   * @param {SchemaFlatter~EntityContext} entityContext Flattening entity context
   * @param {string} entityFqName
   * @param {object} definition
   */
  _flattenEntityPatternProperties (context, entityContext, entityFqName, definition) {
    check.assert.object(context)
    check.assert.object(entityContext)
    check.assert.nonEmptyString(entityFqName)
    check.assert.object(definition)

    if (_.size(entityContext.inheritedFields) === 0) {
      throw new Error(`Instance of '${entityFqName}' is not identifiable and can not have pattern properties`)
    }

    _.forOwn(definition.patternProperties, (propertyDefinition, propertyPattern) => {
      let propertyDefinitionPointer = `${entityContext.definitionOrigin}/patternProperties/${propertyPattern}`
      let subentityFqName
      if (propertyDefinition.$ref) {
        propertyDefinitionPointer = propertyDefinition.$ref
        const subentityName = this._naming.pointerToEntityName(propertyDefinition.$ref)
        subentityFqName = this._naming.getEntityFqName(context.collectionName, subentityName)
        propertyDefinition = JsonUtils.resolveReference(propertyDefinition.$ref, context.jsonSchema)
      } else {
        subentityFqName = this._naming.getVariadicPropertiesEntityFqName(entityFqName, entityContext.usedVariadicPropertiesIndices++)
      }

      if (entityFqName === subentityFqName) {
        throw new Error(`Not supported: '${entityFqName}' has a relation to itself via variadic property`)
      }

      const hasProperties =
        propertyDefinition.properties &&
        _.size(propertyDefinition.properties) > 0
      const hasAdditionalProperties =
        propertyDefinition.additionalProperties &&
        propertyDefinition.additionalProperties !== false
      const hasPatternProperties =
        propertyDefinition.patternProperties &&
        _.size(propertyDefinition.patternProperties) > 0
      const isPropertyDefinitionValueGenerated = !hasProperties && !hasAdditionalProperties && !hasPatternProperties
      if (isPropertyDefinitionValueGenerated) {
        propertyDefinition = this._generateVariadicPropertiesDefinition(propertyDefinition.type, propertyDefinition.enum)
      } else {
        propertyDefinition = _.cloneDeep(propertyDefinition)
        propertyDefinition.properties = propertyDefinition.properties || {}
        propertyDefinition.required = propertyDefinition.required || []

        const key = this._naming.getVariadicPropertiesKeyFieldName()
        propertyDefinition.properties[key] = {
          type: 'string'
        }
        propertyDefinition.required.push(key)
      }

      const subEntity = this._flattenEntity(context, subentityFqName, propertyDefinitionPointer, propertyDefinition, entityContext.inheritedFields)
      subEntity.fields[this._naming.getVariadicPropertiesKeyFieldName()].reference = {
        fieldName: true
      }
      if (isPropertyDefinitionValueGenerated) {
        subEntity.fields[this._naming.getVariadicPropertiesValueFieldName()].reference = {
          field: ''
        }
      }
      entityContext.relations[subentityFqName] = 'one-to-many'
    })
  }

  /**
   * Generates array item definition for given type
   *
   * @param {string} type Type of the element
   * @param {[]} [enumValues=undefined] Values of the enum
   * @returns {Object} JSON schema definition
   */
  _generateArrayItemDefinition (type, enumValues = undefined) {
    let itemDefinition = {
      type: 'object',
      properties: {}
    }

    const value = this._naming.getArrayItemValueFieldName()
    const valueDefinition = {}
    if (type) {
      valueDefinition.type = type
    }
    if (enumValues) {
      valueDefinition.enum = _.clone(enumValues)
    }
    itemDefinition.properties[value] = valueDefinition

    return itemDefinition
  }

  /**
   * Generates variadic properties definition
   *
   * @param {string} [type=undefined] Type of the element
   * @param {[]} [enumValues=undefined] Values of the enum
   * @returns {Object} JSON schema definition
   */
  _generateVariadicPropertiesDefinition (type = undefined, enumValues = undefined) {
    let propertyDefinition = {
      type: 'object',
      properties: {},
      required: []
    }

    const key = this._naming.getVariadicPropertiesKeyFieldName()
    propertyDefinition.properties[key] = {
      type: 'string'
    }
    propertyDefinition.required.push(key)

    const value = this._naming.getVariadicPropertiesValueFieldName()
    const valueDefinition = {}
    if (type) {
      valueDefinition.type = type
    } else if (!enumValues) {
      valueDefinition.type = ['object', 'null']
    }
    if (enumValues) {
      valueDefinition.enum = _.clone(enumValues)
    }
    propertyDefinition.properties[value] = valueDefinition

    return propertyDefinition
  }

  /**
   * Converts specified flattened entities object to JSON schema
   *
   * @param {Object} jsonSchema JSON schema
   * @param {string} collectionName Collection name
   * @return {Object} JSON schema
   */
  flattenToJsonSchema (jsonSchema, collectionName) {
    return SchemaFlatter.toJsonSchema(this.flatten(jsonSchema, collectionName))
  }

  /**
   * Converts specified flattened entities object to JSON schema
   *
   * @param {Object} entities Object with flattened entities
   * @return {Object} JSON schema
   */
  static toJsonSchema (entities) {
    let schema = {
      type: 'object',
      definitions: {},
      properties: {}
    }
    _.forOwn(entities, (entity, entityName) => {
      let definition = schema.definitions[entityName] = {
        type: 'object'
      }
      let properties = {}
      let required = []
      _.forOwn(entity.fields, (field, fieldName) => {
        let property = properties[fieldName] = {}

        if (field.identity) {
          required.push(fieldName)
        }

        if (field.type === 'enum') {
          property.enum = field.enum.slice()
          if (field.nullable) {
            property.enum.push(null)
          }
        } else {
          property.type = []
          if (field.type === 'json') {
            property.type.push('object')
          } else if (field.type === 'datetime') {
            property.type = 'string'
            property.format = 'date-time'
          } else if (field.type === 'date') {
            property.type = 'string'
            property.format = 'date'
          } else if (field.type === 'time') {
            property.type = 'string'
            property.format = 'time'
          } else if (field.type === 'timestamp') {
            property.type = 'integer'
            property.format = 'timestamp'
          } else {
            property.type.push(field.type)
          }
          if (field.nullable) {
            property.type.push('null')
          }
        }
        if (field.default) {
          property.default = field.default
        }
      })
      if (_.size(properties) > 0) {
        definition.properties = properties
      }
      if (required.length > 0) {
        definition.required = required
      }
      schema.properties[entityName] = {
        type: 'array',
        items: {
          $ref: `#/definitions/${JsonUtils.escapeForPointer(entityName)}`
        }
      }
    })
    return schema
  }
}

/**
 * @typedef SchemaFlatter~Context
 * @property {string} collectionName
 * @property {SchemaFlatter~Metadata} entities
 * @property {SchemaFlatter~Entity[]} stack
 * @property {object} jsonSchema
 */

/**
 * @typedef {SchemaFlatter~Context} SchemaFlatter~EntityContext
 */

/**
 * @typedef SchemaFlatter~Metadata
 */

/**
 * @typedef SchemaFlatter~Entity
 * @property {string} origin JSON pointer to part of original JSON schema
 * @property {Object} [fields=undefined] Object with fields
 * @property {Object} [relations=undefined] Object describing relations to other entities
 */

 /**
  * @typedef SchemaFlatter~Reference
  * @property {integer} depth Distance by JSON pointer to object, owning the field
  * @property {string} [entity] Referenced entity
  * @property {string} [field] Use value of referenced field with given name
  * @property {boolean} [fieldName] Use name of referenced field
  */

/**
 * @typedef SchemaFlatter~Relation
 * @property {string} entity Related entity
 * @property {string} field Related entity field
 */

/**
 * @typedef SchemaFlatter~EntityField
 * @property {string} type Type of the field
 * @property {[]} enum Possible values of the enum
 * @property {boolean} nullable True if field can be null, false otherwise
 * @property {} default Default value
 * @property {boolean} identity True if field is part of identity used to identify an instance
 * @property {SchemaFlatter~Reference} [reference=undefined] If field is foreign, describes reference
 * @property {SchemaFlatter~Relation} [relation=undefined] If field defines a relation, describes relation
 */

module.exports = SchemaFlatter
