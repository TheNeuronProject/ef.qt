'use strict'

const camelCase = require('camelcase')
const parseEft = require('eft-parser')
const fs = require('fs-extra')
const path = require('path')
const walk = require('walk')

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
const FLOATPROPS = new Set([])
const DOUBLEPROPS = new Set([])

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
		$widgets.push({type, parent: $parent, parentLayout: $parentLayout, extraProps: extraProps || {}, innerName})
		if (type.indexOf('Q') === 0) $includes[`<${type}>`] = true
		if (ref) $refs.push({type, innerName, name: ref})

		if (props) walkProps({props, innerName, $props, $data})
		if (signals) walkSignals({signals, innerName, type, $methods})

		for (let i of children) walkAst({
			$ast: i,
			$parent: type.indexOf('Layout') < 0 ? innerName : $parent,
			$parentLayout: type.indexOf('Layout') >= 0 ? innerName : null,
			$data, $refs, $methods, $mountingpoints, $props, $widgets, $includes
		})
	} else {
		// handle mounting point
		const {n: name, t: type} = $ast
		$mountingpoints.push({name, list: !!type})
		$widgets.push({name, parent: $parent, parentLayout: $parentLayout, mountpoint: true})
	}
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
	// {type, innerName, *name}
	const strs = []
	for (let {type, name} of $refs) {
		strs.push(`${type} *${name};`)
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
	// {type, parent, parentLayout, extraProps, innerName} || {mountpoint: bool, name}
	const strs = []
	for (let widget of $widgets) {
		if (!widget.mountpoint) {
			const {type, innerName} = widget
			strs.push(`${type} *${innerName};`)
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

const guseeWidgetClass = (widgetName) => {
	widgetName = widgetName.toLowerCase()
	if (widgetName.indexOf('item') >= 0 || widgetName.indexOf('item') >= 0) return 'Item'
	if (widgetName.indexOf('layout') >= 0) return 'Layout'
	return 'Widget'
}

const generate$childInitialization = ({strs, type, widgetClass, previousLayer, previousLayerType, extraProps, innerName}) => {
	if (!previousLayer) return

	const [previousWidgetType, previousClass] = previousLayerType
	let method = 'add'
	let params = ''
	// extraProps.params && `${innerName}, ${extraProps.params}` || innerName

	switch (previousClass) {
		case 'Item':
			throw new TypeError(`Item ${type} cannot have children.`)
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
			const {type, parent, parentLayout, extraProps, innerName} = widget
			const previousLayer = parentLayout || parent
			const previousLayerType = widgetTypeMap[previousLayer] || []
			const widgetClass = guseeWidgetClass(type)
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
				if (type.indexOf('Spacer') >= 0) strs.push(`${innerName} = new ${type}(0, 0);`)
				else if (previousLayerType[1] === 'Layout' && widgetClass === 'Layout') strs.push(`${innerName} = new ${type}();`)
				else strs.push(`${innerName} = new ${type}(${parent || ''});`)

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
	// {type, innerName, *name}
	const strs = []
	for (let {innerName, name} of $refs) {
		strs.push(`$refs.${name} = ${innerName};`)
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
			if (type[0].toLowerCase().indexOf('string') >= 0) strs.push(`$data.${varname} = tr("${defaultVal}");`)
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

const generateClass = ({className, nameSpace, $data, $refs, $methods, $mountingpoints, $props, $widgets}) => `
${nameSpace ? `namespace ${nameSpace} {` : ''}
	class ${className}: public ${$widgets[0].type} {
	public:
		struct {
			${generate$data($data).join(`
			`)}
		} $data;

		struct {
			${generate$refs($refs).join(`
			`)}
		} $refs;

		struct {
			${generate$methods($methods, className).join(`
			`)}
		} $methods;

		${generate$mountingpoints($mountingpoints).join(`
		`)}

	private:
		${generate$widgetsDefinitation($widgets).join(`
		`)}

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

	public:
		${className}() {
			__init_widgets();
			__init_refs();
			__init_value_subscribers();
			__init_methods();
			__init_data();
			__init_props();
		}
	};
${nameSpace ? '}' : ''}
`

const checkIncludes = (source, $includes) => {
	const lines = source.split(/\r?\n/)

	for (let line of lines) {
		const lineContent = line.trim()
		if (lineContent.indexOf('>') === 0) return
		if (lineContent.indexOf(';include ') === 0) {
			const include = line.substring(9, line.length)
			$includes[include] = true
		}
	}
}

const compile = ({className, nameSpace, source}, $includes) => {
	const $data = {} // varname: {type, default, handlers}
	const $refs = [] // {type, innerName, *name}
	const $methods = [] // {innerName, innerMethodName, type, signalName, args: [type, type], handlerName}
	const $mountingpoints = [] // {list: bool, parentLayout, name}

	const $props = {} // innerPropName: {innerName, propName, data || handler}
	const $widgets = [] // {type, parent, parentLayout, extraProps, innerName} || {mountpoint: bool, name, parent}

	const ast = parseEft(source)

	checkIncludes(source, $includes)
	walkAst({$ast: ast, $parent: null, $parentLayout: null, $data, $refs, $methods, $mountingpoints, $props, $widgets, $includes})
	return generateClass({className, nameSpace, $data, $refs, $methods, $mountingpoints, $props, $widgets})
}

const generate$includes = ($includes) => {
	const strs = []
	for (let include of Object.keys($includes)) {
		strs.push(`#include ${include}`)
	}
	return strs
}

const generate = (files) => {
	const $includes = {}
	const resultList = files.map(file => compile(file, $includes))
	return `// Generated by ef.qt on ${(new Date()).toDateString()}

#ifndef EFQT_GENERATED_HPP
#define EFQT_GENERATED_HPP

#include <QtGui>
${generate$includes($includes).join('\n')}

#include "ef_core.hpp"

using namespace ef::core;

namespace ef::ui {
${resultList.join('\n')}
}

#endif // EFQT_GENERATED_HPP
`
}

const fileWalker = ({dir, outFile, ignores}, {verbose, dryrun}) => {
	const realOutPath = path.resolve(outFile)

	if (verbose || dryrun) console.log('[V] Output file full path:', outFile)

	const files = []
	const walker = walk.walk(dir, {
		followLinks: true,
		filters: ['node_modules', ...ignores]
	})

	walker.on('file', (root, fileStats, next) => {
		if (['.ef', '.eft', '.efml'].indexOf(path.extname(fileStats.name)) >= 0) {
			const filePath = path.join(root, fileStats.name)
			if (verbose || dryrun) console.log('[V] Reading file:', filePath)
			fs.readFile(filePath, 'utf8', (err, source) => {
				if (err) throw err
				console.log('Processing', filePath, '...')

				const fileName = fileStats.name.split('.')[0]
				const dirName = path.relative(dir, root)
				const className = camelCase(fileName, {pascalCase: true})
				const nameSpace = dirName === '.' ? null : dirName.replace(/^\.(\\|\/)/, '').replace(/\\|\//g, '::')

				if (verbose || dryrun) {
					console.log('[V] File name:', fileName)
					console.log('[V] Relative dir:', dirName)
					console.log('[V] Generated class name:', className)
					console.log('[V] Generated namesace:', nameSpace)
				}

				files.push({className, nameSpace, source})

				next()
			})
		} else return next()
	})

	walker.on('end', () => {
		if (verbose || dryrun) console.log('[V] Generating header file to:', realOutPath)
		if (dryrun) {
			console.log('All done.')
			console.log(`All templates are NOT generated in \`${realOutPath}'.  (--dryrun)`)
			return
		}
		fs.ensureDir(path.dirname(realOutPath), (err) => {
			if (err) throw err
			fs.outputFile(realOutPath, generate(files), (err) => {
				if (err) throw err
				console.log('All done.')
				console.log(`All templates are generated in \`${realOutPath}'.`)
			})
		})
	})
}

const entry = ({dir = '.', outFile = 'ef.hpp', ignores = [], extraTypeDef = '.eftypedef'}, {verbose, dryrun}) => {
	if (verbose || dryrun) {
		console.log('[V] Scan dir:', dir)
		console.log('[V] Output file:', outFile)
		console.log('[V] Ignored folder(s):', ignores)
		console.log('[V] Extra param type def:', extraTypeDef)
	}

	if (extraTypeDef) {
		if (verbose || dryrun) console.log('[V] Reading extra param type def:', extraTypeDef)
		fs.readJson(extraTypeDef, (err, def) => {
			if (err) {
				if ((extraTypeDef === '.eftypedef' && err.code !== 'ENOENT') || extraTypeDef !== '.eftypedef') throw err
				if (verbose || dryrun) console.log('[V] Default extra param type def read failed, skipped')
			} else {
				if (def.STRPROPS) for (let i of def.STRPROPS) STRPROPS.add(i)
				if (def.BOOLPROPS) for (let i of def.BOOLPROPS) BOOLPROPS.add(i)
				if (def.FLOATPROPS) for (let i of def.FLOATPROPS) FLOATPROPS.add(i)
				if (def.DOUBLEPROPS) for (let i of def.DOUBLEPROPS) DOUBLEPROPS.add(i)
			}


			fileWalker({dir, outFile, ignores}, {verbose, dryrun})
		})
	} else fileWalker({dir, outFile, ignores}, {verbose, dryrun})
}

module.exports = entry
