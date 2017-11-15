const _ = require('lodash')
const check = require('check-types')

/**
 * Generates naming
 */
class FlatterNaming {
  /**
   * @constructor
   * @param {FlatterNaming~Options} [options=undefined] Options
   */
  constructor (options = undefined) {
    check.assert.maybe.object(options)

    this._options = _.assign({}, FlatterNaming.DEFAULT_OPTIONS, options)
  }

  get options () {
    return _.clone(this._options)
  }

  get pathSeparator () {
    return this._options.pathSeparator
  }

  get generatedFieldPrefix () {
    return this._options.generatedFieldPrefix
  }

  get placeholder () {
    return this._options.placeholder
  }

  get scopeSpecifier () {
    return this._options.scopeSpecifier
  }

  /**
   * Converts JSON Pointer to entity name
   *
   * @param {string} pointer
   * @returns {string}
   */
  pointerToEntityName (pointer) {
    check.assert.maybe.string(pointer)

    if (!pointer || pointer.length === 0 || pointer === '#') {
      return ''
    }

    pointer = pointer
      .replace(/(^#\/?)|(\/$)/g, '')
    let components = pointer
      .split('/')
    let entityNameIndex
    for (let i = components.length - 1; i >= 0; i--) {
      const component = components[i]
      if (component.match(/^\d+$/)) {
        components[i] = this._options.placeholder
        continue
      }

      entityNameIndex = i
      break
    }

    const entityName = components
      .slice(entityNameIndex)
      .join(this._options.pathSeparator)

    return entityName
  }

  /**
   * Converts JSON Pointer to fully-qualified entity name
   *
   * @param {string} Pointer
   * @returns {string}
   */
  pointerToEntityFqName (pointer) {
    check.assert.string(pointer)

    return pointer
      .replace(/\/(\d+)/g, `/${this._options.placeholder}`)
      .replace(/(^#\/?)|(\/$)/g, '')
      .replace(/\//g, this._options.pathSeparator)
  }

  /**
   * Gets entity name from specified components
   *
   * @param {...string} components
   * @returns {string}
   */
  getEntityFqName (...components) {
    check.assert.maybe.array.of.string(components)

    if (!components || components.length === 0) {
      return ''
    }
    if (components.length === 1) {
      return components[0]
    }
    return components.join(this._options.pathSeparator)
  }

  /**
   * Gets entity name for variadic properties of specified entity
   *
   * @param {string} entityFqName
   * @param {integer} variadicPropertiesIndex
   * @returns {string}
   */
  getVariadicPropertiesEntityFqName (entityFqName, variadicPropertiesIndex = 0) {
    check.assert.string(entityFqName)
    check.assert.integer(variadicPropertiesIndex)
    check.assert.greaterOrEqual(variadicPropertiesIndex, 0)

    return `${entityFqName}[${this._options.placeholder}${variadicPropertiesIndex}]`
  }

  /**
   * Gets inherited field name for specified property of specified entity (by fully-qualified name)
   *
   * @param {string} entityName Name of entity owning the property
   * @param {string} propertyName Name of property
   */
  getInheritedFieldName (entityName, propertyName) {
    check.assert.string(entityName)
    check.assert.string(propertyName)

    return `${this._options.generatedFieldPrefix}${entityName}${this._options.scopeSpecifier}${propertyName}`
  }

  /**
   * Gets array field name from property name
   */
  getArrayFieldName (propertyName) {
    check.assert.string(propertyName)

    return `${propertyName}[${this._options.placeholder}]`
  }

  /**
   * Gets key field name for variadic properties
   */
  getVariadicPropertiesKeyFieldName () {
    return `${this._options.generatedFieldPrefix}property`
  }

  /**
   * Gets value field name for variadic properties
   */
  getVariadicPropertiesValueFieldName () {
    return `${this._options.generatedFieldPrefix}value`
  }

  /**
   * Gets value field name for array item
   */
  getArrayItemValueFieldName () {
    return `${this._options.generatedFieldPrefix}value`
  }
}

/**
 * @typedef {Object} FlatterNaming~Options
 * @property {string} [pathSeparator] Path separator
 * @property {string} [generatedFieldPrefix] Generated field prefix
 * @property {string} [placeholder] Placeholder
 * @property {string} [scopeSpecifier] Scope specifier
 */
FlatterNaming.DEFAULT_OPTIONS = {
  pathSeparator: '/',
  generatedFieldPrefix: '$',
  placeholder: '@',
  scopeSpecifier: '~'
}

module.exports = FlatterNaming
