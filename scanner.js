'use strict'

const path = require('path')
const walk = require('walk')
const fs = require('fs-extra')
const {
	generate,
	getClassNameWithNameSpace,
	loadExtraTypeDef
} = require('./generator.js')

const getSeperatedOutputFilePathWithRightExtension = (filePath, extensionName) => {
	const fileNameSegments = filePath.split('.')
	fileNameSegments.pop()
	fileNameSegments.push(extensionName)
	return fileNameSegments.join('.')
}

const fileWalker = ({dir, outPath, seperate, ignores, extensionName}, {verbose, dryrun}, cb) => {
	const dest = path.resolve(outPath)

	if (verbose || dryrun) console.log('[V] Output full path:', outPath)

	const files = []
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

				files.push({className, nameSpace, filePath, source})

				next()
			})
		} else return next()
	})

	if (seperate) walker.on('end', () => {
		let doneCount = 0

		const checkEnd = (e) => {
			if (e) throw e
			doneCount += 1
			if (doneCount >= files.length) {
				if (cb) return cb()
				return
			}
		}

		for (let file of files) {
			const outFilePath = getSeperatedOutputFilePathWithRightExtension(file.filePath, extensionName)
			generate({files: [file], dest: path.join(dest, outFilePath)}, {verbose, dryrun}, checkEnd)
		}
	})
	else walker.on('end', () => generate({files, dest}, {verbose, dryrun}, cb))
}

const scanEntry = ({dir = '.', outPath = 'ef.hpp', seperate = false, ignores = [], extensionName = 'hpp', extraTypeDef = '.eftypedef'}, {verbose, dryrun}, cb) => {
	if (seperate && outPath === 'ef.hpp') outPath = '.efgenerated/ef'
	if (seperate) ignores.push(outPath)
	if (verbose || dryrun) {
		console.log('[V] Scan dir:', dir)
		console.log('[V] Output path:', outPath)
		console.log('[V] Seperate headers:', seperate)
		console.log('[V] Ignored folder(s):', ignores)
		console.log('[V] Extra param type def:', extraTypeDef)
	}

	const walkFiles = () => fileWalker({dir, outPath, seperate, ignores, extensionName}, {verbose, dryrun}, cb)

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

	const compileFile = () => {
		fs.readFile(input, 'utf8', (err, source) => {
			if (err) return console.error(err)

			const files = [{className, nameSpace, filePath, source}]
			generate({files, dest: output}, {verbose, dryrun}, cb)
		})
	}

	if (extraTypeDef) return loadExtraTypeDef({extraTypeDef}, {verbose, dryrun}, compileFile)
	else return compileFile()
}

module.exports = {scanEntry, compileSingleFile, getSeperatedOutputFilePathWithRightExtension}
