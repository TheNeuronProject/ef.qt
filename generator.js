'use strict'

const camelCase = require('camelcase')
const parseEft = require('eft-parser')
const crypto = require('crypto')
const fs = require('fs-extra')
const path = require('path')

const STRPROPS = new Set([
	'windowTitle', 'text', 'placeholderText', 'title', 'currentText', 'styleSheet',
	'statusTip', 'toolTip', 'whatsThis', 'accessibleName', 'accessibleDescription',
	'windowFilePath', 'windowRole'
])
const BOOLPROPS = new Set([
	'checked', 'enabled', 'openExternalLinks', 'acceptDrops', 'autoFillBackground',
	'editFocus', 'mouseTracking', 'tabletTracking', 'updatesEnabled', 'disabled',
	'hidden', 'visible', 'windowModified', 'documentMode', 'animated', 'dockNestingEnabled',
	'unifiedTitleAndToolBarOnMac', 'defaultUp', 'nativeMenuBar', 'separatorsCollapsible',
	'tearOffEnabled', 'toolTipsVisible', 'widgetResizable'
])
const VIRTUAL_WIDGET_CLASSES = new Set(['EFSeparator'])
const FLOATPROPS = new Set([])
const DOUBLEPROPS = new Set([])
const NOAUTOINCLUDES = new Set([])

const typeDefRegex = /^\((.+?)\)/

const T = {
	STRING: 'EFVar<QString>',
	BOOL: 'EFVar<bool>',
	FLOAT: 'EFVar<float>',
	DOUBLE: 'EFVar<double>',
	INT: 'EFVar<int>'
}

const B = {
	[T.STRING]: 'const QString&',
	[T.BOOL]: 'bool',
	[T.FLOAT]: 'float',
	[T.DOUBLE]: 'double',
	[T.INT]: 'int'
}

const U = {
	'string': [T.STRING, B[T.STRING]],
	'bool': [T.BOOL, B[T.BOOL]],
	'float': [T.FLOAT, B[T.FLOAT]],
	'double': [T.DOUBLE, B[T.DOUBLE]],
	'int': [T.INT, B[T.INT]]
}

const getTypeDef = (propName) => {
	if (STRPROPS.has(propName)) return T.STRING
	if (BOOLPROPS.has(propName)) return T.BOOL
	if (FLOATPROPS.has(propName)) return T.FLOAT
	if (DOUBLEPROPS.has(propName)) return T.DOUBLE
	return T.INT
}

const getBaseType = type => B[type]

const getUserType = (type) => {
	if (U[type]) return U[type]
	return [`EFVar<${type}>`, `const ${type}&`]
}

const isStringProp = propName => STRPROPS.has(propName)

const capitalizeFirstCharacter = lower => lower.charAt(0).toUpperCase() + lower.substring(1)

// [varname, usertype, customized]
const parseVarName = (varpath) => {
	const [firstVar, ...vars] = varpath
	const typeMatch = firstVar.match(typeDefRegex)
	if (typeMatch) return [[firstVar.replace(typeDefRegex, ''), ...vars].join('.'), getUserType(typeMatch[1]), true]
	else return [varpath.join('.'), null, false]
}

const getDynamicArgs = (propName, prop) => {
	const [strs, ...vars] = prop
	if (strs === 0) {
		const [varpath] = vars[0]
		return `*$data.${parseVarName(varpath)[0]}`
	}

	const stringProp = isStringProp(propName)

	const args = []
	for (let i = 0; i < vars.length; i++) {
		const [varpath] = vars[i]
		const str = strs[i]
		if (str !== '') {
			if (stringProp) args.push(`tr("${str}")`)
			else args.push(str)
		}
		args.push(`*$data.${parseVarName(varpath)[0]}`)
	}
	if (strs[vars.length] !== '') {
		if (stringProp) args.push(`tr("${strs[vars.length]}")`)
		else args.push(strs[vars.length])
	}

	if (stringProp) return args.join(' + ')
	else return args.join('')
}

const guseeWidgetClass = (widgetName) => {
	const [actualWidgetName, manualOverrided] = widgetName.split('!')
	if (manualOverrided) return [actualWidgetName, manualOverrided]

	const loweredWidgetName = actualWidgetName.toLowerCase()
	if (loweredWidgetName.includes('item')) return [actualWidgetName, 'Item']
	if (loweredWidgetName.includes('layout')) return [actualWidgetName, 'Layout']
	if (loweredWidgetName.includes('action')) return [actualWidgetName, 'Action']
	if (loweredWidgetName.includes('efseparator')) return [actualWidgetName, 'EFSeparator']
	if (loweredWidgetName.includes('menubar')) return [actualWidgetName, 'MenuBar']
	if (loweredWidgetName.includes('menu')) return [actualWidgetName, 'Menu']
	return [actualWidgetName, 'Widget']
}

const walkProps = ({props, innerName, $props, $data}) => {
	for (let [propName, prop] of Object.entries(props)) {
		const innerPropName = `__${innerName}_${propName}`
		if (!$props[innerPropName]) $props[innerPropName] = {innerName, propName}
		if (Array.isArray(prop)) {
			// dynamic property
			const handler = $props[innerPropName].handler || `${innerName}->set${capitalizeFirstCharacter(propName)}(${getDynamicArgs(propName, prop)});`
			if (!$props[innerPropName].handler) $props[innerPropName].handler = handler

			// store handlers for variable
			const [, ...vars] = prop
			for (let [varpath, defaultVal] of vars) {
				const [varname, userType, customized] = parseVarName(varpath)
				if (!$data[varname]) {
					if (userType) {
						$data[varname] = {
							type: userType,
							handlers: []
						}
					} else {
						const type = getTypeDef(propName)
						const baseType = getBaseType(type)

						$data[varname] = {
							type: [type, baseType],
							handlers: []
						}
					}
				}

				if (customized) $data[varname].type = userType
				if (typeof defaultVal !== 'undefined') $data[varname].default = defaultVal
				$data[varname].handlers.push(handler)
			}
		} else {
			// static property
			$props[innerPropName].data = prop
		}
	}
}

const walkSignals = ({signals, innerName, type, $methods}) => {
	for (let signal of signals) {
		const {l: signalDef, m: handlerName} = signal
		const [signalName, argStr] = signalDef.split(':')
		const args = argStr ? argStr.split(',').map(i => i.trim()) : []
		const innerMethodName = `__handler_${handlerName}`

		$methods.push({innerName, innerMethodName, type, signalName, args, handlerName})
	}
}

const walkAst = ({$ast, $parent, $parentLayout, $data, $refs, $methods, $mountingpoints, $props, $widgets, $includes}) => {
	if (Array.isArray($ast)) {
		// handle widget
		const [self, ...children] = $ast
		const {t: type, r: ref, a: props, e: signals, p: extraProps} = self

		const innerName = `__widget_${$widgets.length}`
		const [actualWidgetName, widgetClass] = guseeWidgetClass(type)
		$widgets.push({type: actualWidgetName, parent: $parent, parentLayout: $parentLayout, extraProps: extraProps || {}, innerName, widgetClass})
		if (actualWidgetName.startsWith('Q') && !NOAUTOINCLUDES.has(actualWidgetName)) $includes.add(`<${actualWidgetName}>`)
		if (ref) $refs.push({actualWidgetName, innerName, name: ref, widgetClass})

		if (props) walkProps({props, innerName, $props, $data})
		if (signals) walkSignals({signals, innerName, actualWidgetName, $methods})

		const isLayout = actualWidgetName.includes('Layout')

		for (let i of children) walkAst({
			$ast: i,
			$parent: isLayout ? $parent : innerName,
			$parentLayout: isLayout ? innerName : null,
			$data, $refs, $methods, $mountingpoints, $props, $widgets, $includes
		})
	} else {
		// handle mounting point
		const {n: name, t: type} = $ast
		$mountingpoints.push({name, list: !!type})
		$widgets.push({name, parent: $parent, parentLayout: $parentLayout, mountpoint: true})
	}
}

const generate$usings = ($usings) => {
	const strs = []
	for (let using of $usings) {
		strs.push(`using ${using};`)
	}
	return strs
}

const generate$data = ($data) => {
	// varname: {type: [eftype, basetype], default, handlers}
	const strs = []
	for (let [varname, {type}] of Object.entries($data)) {
		strs.push(`${type[0]} ${varname};`)
	}
	return strs
}

const generate$refs = ($refs) => {
	// {type, innerName, *name, widgetClass}
	const strs = []
	for (let {type, name, widgetClass} of $refs) {
		if (!VIRTUAL_WIDGET_CLASSES.has(widgetClass)) strs.push(`${type} *${name};`)
	}
	return strs
}

const generate$methods = ($methods, className) => {
	// {innerName, innerMethodName, type, signalName, args: [type, type], handlerName}
	const strs = []
	const generated = {}
	for (let {handlerName, args} of $methods) {
		if (!generated[handlerName]) {
			generated[handlerName] = true
			strs.push(`std::function<void(${className}&${args.length ? ['', ...args].join(', ') : ''})> ${handlerName};`)
		}
	}
	return strs
}

const generate$mountingpoints = ($mountingpoints) => {
	// {list: bool, parentLayout, name}
	const strs = []
	for (let {list, name} of $mountingpoints) {
		strs.push(`${list && 'EFListMountingPoint' || 'EFMountingPoint'} ${name};`)
	}
	return strs
}

const generate$widgetsDefinitation = ($widgets) => {
	// {type, parent, parentLayout, extraProps, innerName, widgetClass} || {mountpoint: bool, name}
	const strs = []
	for (let widget of $widgets) {
		if (!widget.mountpoint) {
			const {type, innerName, widgetClass} = widget
			if (!VIRTUAL_WIDGET_CLASSES.has(widgetClass)) strs.push(`${type} *${innerName};`)
		}
	}
	return strs
}

const generate$handlers = ($methods) => {
	// {innerName, innerMethodName, type, signalName, args: [type, type], handlerName}
	const strs = []
	const generated = {}
	for (let {innerMethodName, args, handlerName} of $methods) {
		if (!generated[handlerName]) {
			generated[handlerName] = true
			const argArr = args.map((curr, index) => [curr, `__v${index}`])

			const wrapperArgs = argArr.map(curr => curr.join(' ')).join(', ')
			const handlerArgs = ['', ...argArr.map(curr => curr[1])].join(', ')
			strs.push(`void ${innerMethodName}(${wrapperArgs}) {
			if ($methods.${handlerName})
				$methods.${handlerName}(*this${handlerArgs});
		}`)
		}
	}

	return strs
}

const generate$childInitialization = ({strs, widgetClass, previousLayer, previousLayerType, extraProps, innerName}) => {
	if (!previousLayer) return

	const [previousWidgetType, previousClass] = previousLayerType
	let method = 'add'
	let params = ''
	// extraProps.params && `${innerName}, ${extraProps.params}` || innerName

	switch (previousClass) {
		case 'Item':
		case 'Action':
		case 'Separator':
			return
		case 'Layout':
			if (previousWidgetType === 'QGridLayout') {
				const [,, index, width] = previousLayerType
				if (!width && !extraProps.position) throw new SyntaxError('QGridLayout must have `width\' attribure ro children of QGridLayout must have `position\' attribute.')
				previousLayerType[2] += 1

				if (extraProps.position) params = `${innerName}, ${extraProps.position}`
				else {
					let row = Math.floor(index / width)
					let col = index - row * width

					params = `${innerName}, ${row}, ${col}`
				}
			} else if (previousWidgetType === 'QFormLayout') {
				method = 'set'
				if (extraProps.position) params = `${extraProps.position}, ${innerName}`
				else {
					const [,, index, position] = previousLayerType
					const role = position && 'QFormLayout::ItemRole::LabelRole' || 'QFormLayout::ItemRole::FieldRole'

					if (!position) previousLayerType[2] += 1
					previousLayerType[3] = !previousLayerType[3]

					params = `${index}, ${role}, ${innerName}`
				}
			} else params = innerName
			break
		case 'Widget':
			if (widgetClass === 'Layout') {
				method = 'set'
				params = innerName
			} else return
			break
		case 'MenuBar':
		case 'Menu':
			if (widgetClass === 'EFSeparator') {
				widgetClass = 'Separator'
			} else if (['Menu', 'Action'].indexOf(widgetClass) >= 0) {
				params = innerName
			} else return
			break
		default:
	}

	strs.push(`${previousLayer}->${method}${widgetClass}(${params});`)
}

const generate$widgetInitialization = ($widgets) => {
	// {type, parent, parentLayout, extraProps, innerName} || {mountpoint: bool, name}
	const strs = []
	const widgetTypeMap = {} // [type, class, (index, position) || (index, width)]

	let topInitialized = false

	for (let widget of $widgets) {
		if (widget.mountpoint) {
			const {name, parent} = widget
			strs.push(`${name}.__set_widget(${parent});`)
		} else {
			const {type, parent, parentLayout, extraProps, innerName, widgetClass} = widget
			const previousLayer = parentLayout || parent
			const previousLayerType = widgetTypeMap[previousLayer] || []
			const typeInfo = [type, widgetClass]
			widgetTypeMap[innerName] = typeInfo

			if (type === 'QFormLayout') {
				typeInfo[2] = 0
				typeInfo[3] = true
			} else if (type === 'QGridLayout' && extraProps.width) {
				typeInfo[2] = 0
				typeInfo[3] = extraProps.width
			}

			if (topInitialized) {
				if (!VIRTUAL_WIDGET_CLASSES.has(widgetClass)) {
					if (type.includes('Spacer')) strs.push(`${innerName} = new ${type}(0, 0);`)
					else if (previousLayerType[1] === 'Layout' && widgetClass === 'Layout') strs.push(`${innerName} = new ${type}();`)
					else strs.push(`${innerName} = new ${type}(${parent || ''});`)
				}

				generate$childInitialization({strs, type, widgetClass, previousLayer, previousLayerType, extraProps, innerName})
			} else {
				strs.push(`${innerName} = this;`)
				topInitialized = true
			}
		}
	}
	return strs
}

const generate$refsInitialization = ($refs) => {
	// {type, innerName, *name, widgetClass}
	const strs = []
	for (let {innerName, name, widgetClass} of $refs) {
		if (!VIRTUAL_WIDGET_CLASSES.has(widgetClass)) strs.push(`$refs.${name} = ${innerName};`)
	}
	return strs
}

const generate$valueSubscribers = ($data) => {
	// varname: {type: [eftype, basetype], default, handlers}
	const strs = []
	for (let [varname, {type, handlers}] of Object.entries($data)) {
		strs.push(`$data.${varname}.subscribe(std::make_shared<std::function<void(${type[1]})>>(
				[this](auto _){
					${handlers.join(`
					`)}
				}
			));`)
	}
	return strs
}

const generate$methodsInitialization = ($methods, className) => {
	// {innerName, innerMethodName, type, signalName, args: [type, type], handlerName}
	const strs = []
	for (let {innerName, innerMethodName, type, signalName, args} of $methods) {
		strs.push(`QObject::connect(${innerName}, &${type}::${signalName}, std::bind(&${className}::${innerMethodName}, this${args.length && ', ' || ''}${args.map((_, idx) => `_${idx + 1}`).join(', ')}));`)
	}
	return strs
}

const generate$dataInitialization = ($data) => {
	// varname: {type, default, handlers}
	const strs = []
	for (let [varname, {type, default: defaultVal}] of Object.entries($data)) {
		if (typeof defaultVal !== 'undefined') {
			if (type[0].toLowerCase().includes('string')) strs.push(`$data.${varname} = tr("${defaultVal}");`)
			else strs.push(`$data.${varname} = ${defaultVal};`)
		}
	}
	return strs
}

const generate$props = ($props) => {
	// innerPropName: {innerName, propName, data || handler}
	const strs = []
	for (let [, {innerName, propName, data}] of Object.entries($props)) {
		if (typeof data !== 'undefined') {
			if (isStringProp(propName)) strs.push(`${innerName}->set${capitalizeFirstCharacter(propName)}(tr("${data}"));`)
			else strs.push(`${innerName}->set${capitalizeFirstCharacter(propName)}(${data});`)
		}
	}
	return strs
}

const generateClass = ({filePath, fileHash, className, nameSpace, $customUsings, $data, $refs, $methods, $mountingpoints, $props, $widgets}) => {
	const proto = $widgets[0].type
	return `// source: ${filePath}:${fileHash}
namespace ef::ui${nameSpace && `::${nameSpace}` || ''} {
	// Custom using
	${generate$usings($customUsings).join(`
	`)}
	class ${className}: public ${proto} {
	public:
		// Data variables
		struct {
			${generate$data($data).join(`
			`)}
		} $data;

		// Widget references
		struct {
			${generate$refs($refs).join(`
			`)}
		} $refs;

		// Signal handling methods
		struct {
			${generate$methods($methods, className).join(`
			`)}
		} $methods;

		// Mounting Points
		${generate$mountingpoints($mountingpoints).join(`
		`)}

	private:
		// Internal widget names
		${generate$widgetsDefinitation($widgets).join(`
		`)}

		// Internal signal handlers
		${generate$handlers($methods).join(`

		`)}

		void __init_widgets() {
			${generate$widgetInitialization($widgets).join(`
			`)}
		}

		void __init_refs() {
			${generate$refsInitialization($refs).join(`
			`)}
		}

		void __init_value_subscribers() {
			${generate$valueSubscribers($data).join(`
			`)}
		}

		void __init_methods() {
			using namespace std::placeholders;
			${generate$methodsInitialization($methods, className).join(`
			`)}
		}

		void __init_data() {
			${generate$dataInitialization($data).join(`
			`)}
		}

		void __init_props() {
			${generate$props($props).join(`
			`)}
		}

		void __init() {
			__init_widgets();
			__init_refs();
			__init_value_subscribers();
			__init_methods();
			__init_data();
			__init_props();
		}

	public:
		${className}() {
			__init();
		}

		template <typename... Args>
		${className}(Args... __args) : ${proto}::${proto.split('::').pop()}(std::forward<Args>(__args)...) {
			__init();
		}
	};
}
`
}

const checkMetadata = (source) => {
	const lines = source.split(/\r?\n/)
	const $customIncludes = new Set()
	const $customUsings = new Set()
	let $customNameSpace = null
	let $customClassName = null

	for (let line of lines) {
		const lineContent = line.trim()
		if (lineContent.startsWith('>')) return {$customIncludes, $customUsings, $customNameSpace, $customClassName}
		if (lineContent.startsWith(';include ')) $customIncludes.add(line.substring(9, line.length))
		else if (lineContent.startsWith(';namespace ')) $customNameSpace = line.substring(11, line.length)
		else if (lineContent.startsWith(';classname ')) $customClassName = line.substring(11, line.length)
		else if (lineContent.startsWith(';using ')) $customUsings.add(line.substring(7, line.length))
	}

	return {$customIncludes, $customUsings, $customNameSpace, $customClassName}
}

const compile = ([filePath, {className, nameSpace, source}]) => {
	console.log('Processing', filePath, '...')

	const $data = {} // varname: {type, default, handlers}
	const $refs = [] // {type, innerName, *name, widgetClass}
	const $methods = [] // {innerName, innerMethodName, type, signalName, args: [type, type], handlerName}
	const $mountingpoints = [] // {list: bool, parentLayout, name}

	const $props = {} // innerPropName: {innerName, propName, data || handler}
	const $widgets = [] // {type, parent, parentLayout, extraProps, innerName, widgetClass} || {mountpoint: bool, name, parent}
	const $includes = new Set()

	const fileHash = crypto
	.createHash('md5')
	.update(source)
	.digest('hex')

	try {
		const ast = parseEft(source)

		const {$customIncludes, $customUsings, $customNameSpace, $customClassName} = checkMetadata(source)
		if ($customNameSpace !== null) nameSpace = $customNameSpace
		if ($customClassName !== null) className = $customClassName

		walkAst({$ast: ast, $parent: null, $parentLayout: null, $data, $refs, $methods, $mountingpoints, $props, $widgets, $includes})

		return [filePath, [
			generateClass({filePath, fileHash, className, nameSpace, $customUsings, $data, $refs, $methods, $mountingpoints, $props, $widgets}),
			{className, nameSpace, $includes, $customIncludes}
		]]
	} catch (e) {
		if (e.message === 'Failed to parse eft template: Template required, but nothing given. at line -1') return ['', {}]
		throw e
	}
}

const generate$includes = ($includes) => {
	const strs = []
	for (let include of $includes) {
		strs.push(`#include ${include}`)
	}
	return strs
}

const generate$classDefs = $results => [...$results].map(([, [, {className, nameSpace}]]) => {
	if (nameSpace) return `	namespace ${nameSpace} {
		class ${className};
	}`
	else return `	class ${className};`
})

const generate$results = $results => [...$results].map(([, [result]]) => result)

const removeTrailingSpaces = source => source
.split('\n')
.map(line => line.trimEnd())
.join('\n')

const generateSingleFile = ($results) => {
	const includes = new Set()
	const customIncludes = new Set()

	for (let [, [, {$includes, $customIncludes}]] of $results) {
		for (let include of $includes) includes.add(include)
		for (let customInclude of $customIncludes) customIncludes.add(customInclude)
	}

	return removeTrailingSpaces(`
#pragma once

#include <QtGui>
#include "ef_core.hpp"

namespace ef::ui {
${generate$classDefs($results).join('\n')}
}

// Auto generated includes
${generate$includes(includes).join('\n')}
// User defined includes
${generate$includes(customIncludes).join('\n')}

using namespace ef::core;

${generate$results($results).join('\n')}
`)
}

const checkNeedsUpdate = ({files, dest, currentVersion}, {verbose, dryrun}, cb) => {
	const lastSourceHashMap = new Map()
	fs.readFile(dest, 'utf8', (err, lastGeneratedFile) => {
		if (err) {
			if (err.code === 'ENOENT') return cb(null, true)
			else return console.error(err)
		}

		const lines = lastGeneratedFile.split('\n')
		const lastVersion = lines.shift().split(' ')[4]
		if (lastVersion !== currentVersion) {
			if (verbose || dryrun) console.log(`[V] Last generated ef.qt version ${lastVersion} not match with current version ${currentVersion}, regenerate...`)
			return cb(null, true)
		}

		for (let line of lines) {
			if (line.startsWith('// source: ')) {
				const content = line.substring(11, line.length)
				const [filePath, sourceHash] = content.split(':')
				lastSourceHashMap.set(filePath, sourceHash)
			}
		}

		for (let [filePath, {source}] of files) {
			const sourceHash = crypto
			.createHash('md5')
			.update(source)
			.digest('hex')

			if (sourceHash !== lastSourceHashMap.get(filePath)) {
				if (verbose || dryrun) console.log(`[V] Found hash mismatch in \`${filePath}', regenerate...`)
				return cb(null, true)
			}
		}

		console.log(`Nothing changed, no need to update \`${dest}'.`)

		return cb(null, false)
	})
}

const writeOutput = ({$results, dest, currentVersion}, {verbose, dryrun}, cb) => {
	const outputContent = `// Generated by ef.qt ${currentVersion} on ${(new Date()).toDateString()}
${generateSingleFile($results)}`

	if (verbose || dryrun) console.log('[V] Writing generated header to:', dest)
	if (dryrun) {
		console.log(`Done: Header NOT generated in \`${dest}'.  (--dryrun)`)
		if (cb) return cb(null, {$results, dest, currentVersion})
		return
	}

	fs.ensureDir(path.dirname(dest), (err) => {
		if (err) {
			if (cb) return cb(err)
			return console.error(err)
		}

		fs.outputFile(dest, outputContent, (err) => {
			if (err) {
				if (cb) return cb(err)
				return console.error(err)
			}
			console.log(`Done: Header generated in \`${dest}'.`)
			if (cb) return cb(null, {$results, dest, currentVersion})
		})
	})
}

const generate = ({files, dest}, {verbose, dryrun, watch}, cb) => {
	fs.readJson(path.resolve(__dirname, 'package.json'), (err, packageInfo) => {
		if (err) return console.error(err)
		const {version} = packageInfo
		const currentVersion = `v${version}`

		checkNeedsUpdate({files, dest, currentVersion}, {verbose, dryrun}, (err, needsUpdate) => {
			if (err) {
				if (cb) return cb(err)
				return console.error(err)
			}
			if (watch || needsUpdate) {
				try {
					if (cb) return cb(null, {$results: new Map([...files].map(file => compile(file))), dest, currentVersion, needsUpdate})
				} catch (e) {
					if (cb) return cb(e)
					return console.error(e)
				}
			}
		})
	})
}

const getClassNameWithNameSpace = (fileName, dirName) => {
	const className = camelCase(fileName, {pascalCase: true})
	let nameSpace = ''
	if (dirName !== '.') nameSpace = dirName
	.replace(/^\.(\\|\/)/, '')
	.split(path.sep)
	.map(i => camelCase(i, {pascalCase: true}))
	.join('::')

	return [className, nameSpace]
}

const loadExtraConfig = ({extraConfig}, {verbose, dryrun}, cb) => {
	if (verbose || dryrun) console.log('[V] Reading extra config:', extraConfig)

	fs.readJson(extraConfig, (err, def) => {
		if (err) {
			if ((extraConfig === '.efextraconfig' && err.code !== 'ENOENT') || extraConfig !== '.efextraconfig') return console.error(err)
			if (verbose || dryrun) console.log('[V] Default extra config read failed, skipped')
		} else {
			if (def.STRPROPS) for (let i of def.STRPROPS) STRPROPS.add(i)
			if (def.BOOLPROPS) for (let i of def.BOOLPROPS) BOOLPROPS.add(i)
			if (def.FLOATPROPS) for (let i of def.FLOATPROPS) FLOATPROPS.add(i)
			if (def.DOUBLEPROPS) for (let i of def.DOUBLEPROPS) DOUBLEPROPS.add(i)
			if (def.NOAUTOINCLUDES) for (let i of def.NOAUTOINCLUDES) NOAUTOINCLUDES.add(i)
		}

		return cb()
	})
}

module.exports = {compile, generate, getClassNameWithNameSpace, loadExtraConfig, writeOutput}
