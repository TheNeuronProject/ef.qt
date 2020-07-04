'use strict'

const path = require('path')
const walk = require('walk')
const fs = require('fs-extra')
const {generate, getClassNameWithNameSpace, loadExtraTypeDef, writeOutput} = require('./generator.js')

const getSeperatedOutputFilePathWithRightExtension = (filePath, extensionName) => {
	const fileNameSegments = filePath.split('.')
	fileNameSegments.pop()
	fileNameSegments.push(extensionName)
	return fileNameSegments.join('.')
}

const fileWalker = ({dir, outPath, seperate, ignores, extensionName}, {verbose, dryrun, watch}, cb) => {
	const dest = path.resolve(outPath)

	if (verbose || dryrun) console.log('[V] Output full path:', outPath)

	const files = new Map()
	const walker = walk.walk(dir, {
		followLinks: true,
		filters: ['node_modules', ...ignores]
	})

	walker.on('file', (root, fileStats, next) => {
		if (['.ef', '.eft', '.efml'].includes(path.extname(fileStats.name))) {
			const fileOrigPath = path.join(root, fileStats.name)
			const filePath = path.relative(dir, fileOrigPath)
			if (verbose || dryrun) console.log('[V] Reading file:', fileOrigPath)
			fs.readFile(fileOrigPath, 'utf8', (err, source) => {
				if (err) return console.error(err)

				const fileName = path.basename(fileStats.name, path.extname(fileStats.name))
				const dirName = path.relative(dir, root)
				const [className, nameSpace] = getClassNameWithNameSpace(fileName, dirName)

				if (verbose || dryrun) {
					console.log('[V] Input file:', fileName)
					console.log('[V] Relative dir:', dirName)
					console.log('[V] Relative input path:', filePath)
					console.log('[V] Generated class name:', className)
					console.log('[V] Generated namesace:', nameSpace)
				}

				files.set(filePath, {className, nameSpace, source})

				next()
			})
		} else return next()
	})

	const writeResults = (e, {$results, dest, currentVersion, needsUpdate} = {}) => {
		if (e) {
			if (cb) return cb(e)
			return console.error(e)
		}
		if (needsUpdate) return writeOutput({$results, dest, currentVersion}, {verbose, dryrun}, cb)
		return cb(null, {$results, dest, currentVersion})
	}

	if (seperate) walker.on('end', () => {
		let doneCount = 0

		const checkEnd = (e) => {
			if (e) {
				if (cb) return cb(e)
				return console.error(e)
			}
			doneCount += 1
			if (doneCount >= files.size) {
				if (cb) return cb()
				return
			}
		}

		const writeAndCheckEnd = (e, {$results, dest, currentVersion} = {}) => {
			if (e) {
				if (cb) return cb(e)
				return console.error(e)
			}
			doneCount += 1
			return writeOutput({$results, dest, currentVersion}, {verbose, dryrun}, checkEnd)
		}

		for (let [filePath, file] of files) {
			const outFilePath = getSeperatedOutputFilePathWithRightExtension(filePath, extensionName)
			generate({files: new Map([[filePath, file]]), dest: path.join(dest, outFilePath)}, {verbose, dryrun}, writeAndCheckEnd)
		}
	})
	else walker.on('end', () => generate({files, dest}, {verbose, dryrun, watch}, writeResults))
}

const scanEntry = ({dir = '.', outPath = 'ef.hpp', seperate = false, ignores = [], extensionName = 'hpp', extraTypeDef = '.eftypedef'}, {verbose, dryrun, watch}, cb) => {
	if (seperate && outPath === 'ef.hpp') outPath = '.efgenerated/ef'
	if (seperate) ignores.push(outPath)
	if (verbose || dryrun) {
		console.log('[V] Scan dir:', dir)
		console.log('[V] Output path:', outPath)
		console.log('[V] Seperate headers:', seperate)
		console.log('[V] Ignored folder(s):', ignores)
		console.log('[V] Extra param type def:', extraTypeDef)
	}

	const walkFiles = () => fileWalker({dir, outPath, seperate, ignores, extensionName}, {verbose, dryrun, watch}, cb)

	if (extraTypeDef) return loadExtraTypeDef({extraTypeDef}, {verbose, dryrun}, walkFiles)
	else return walkFiles()
}

const compileSingleFile = ({input, output, base, extraTypeDef}, {verbose, dryrun}, cb) => {
	const fileName = path.basename(input, path.extname(input))
	const dirName = path.relative(base, path.dirname(input))
	const filePath = path.relative(base, input)
	const [className, nameSpace] = getClassNameWithNameSpace(fileName, dirName)
	if (verbose || dryrun) {
		console.log('[V] Input file:', input)
		console.log('[V] Output file:', output)
		console.log('[V] Relative input path:', filePath)
		console.log('[V] Generated class name:', className)
		console.log('[V] Generated namesace:', nameSpace)
	}

	const writeResults = (e, {$results, dest, currentVersion} = {}) => {
		if (e) {
			if (cb) return cb(e)
			return console.error(e)
		}
		return writeOutput({$results, dest, currentVersion}, {verbose, dryrun}, cb)
	}

	const compileFile = () => {
		fs.readFile(input, 'utf8', (err, source) => {
			if (err) return console.error(err)

			const files = new Map([[filePath, {className, nameSpace, source}]])
			generate({files, dest: output}, {verbose, dryrun}, writeResults)
		})
	}

	if (extraTypeDef) return loadExtraTypeDef({extraTypeDef}, {verbose, dryrun}, compileFile)
	else return compileFile()
}

module.exports = {scanEntry, compileSingleFile, getSeperatedOutputFilePathWithRightExtension}
