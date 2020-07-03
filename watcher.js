const chokidar = require('chokidar')
const path = require('path')
const fs = require('fs-extra')
const {scanEntry, compileSingleFile, getSeperatedOutputFilePathWithRightExtension} = require('./scanner')
const {compile, getClassNameWithNameSpace, writeOutput} = require('./generator')

const getHandlers = ({dir, debounce, outPath, seperate, ignores, extensionName, extraTypeDef}, {verbose, dryrun}) => {
	let debounceTimerID = 0
	const changedFiles = new Set()
	const removedFiles = new Set()

	let regenerate = null
	if (seperate) {
		if (outPath === 'ef.hpp') outPath = outPath = '.efgenerated/ef'
		ignores.push(outPath)
		regenerate = () => {
			for (let file of changedFiles) {
				const outFilePath = getSeperatedOutputFilePathWithRightExtension(file, extensionName)
				compileSingleFile({input: path.join(dir, file), output: path.join(outPath, outFilePath), base: dir, extraTypeDef}, {verbose, dryrun})
			}

			for (let file of removedFiles) {
				const outFilePath = getSeperatedOutputFilePathWithRightExtension(file, extensionName)
				const realOutFilePath = path.join(outPath, outFilePath)
				fs.remove(realOutFilePath, (err) => {
					if (err) return console.error(err)
				})
			}

			changedFiles.clear()
			removedFiles.clear()
		}
	} else {
		let firstRun = true
		let $results = null
		let dest = ''
		let currentVersion = ''

		regenerate = () => {
			if (firstRun) {
				scanEntry({dir, outPath, seperate, ignores, extensionName, extraTypeDef}, {verbose, dryrun, watch: true}, (e, {$results: _results, dest: _dest, currentVersion: _currentVersion}) => {
					if (e) return console.error(e)
					$results = _results
					dest = _dest
					currentVersion = _currentVersion
					firstRun = false
					console.log('Compile cache generated.')
				})
				changedFiles.clear()
				removedFiles.clear()
				return
			}

			let reCompiledFileCount = 0

			const handleFileRead = file => (e, source) => {
				if (e) return console.error(e)

				const filePath = path.relative(dir, file)

				const fileName = path.basename(file, path.extname(file))
				const dirName = path.dirname(filePath)
				const [className, nameSpace] = getClassNameWithNameSpace(fileName, dirName)

				if (verbose || dryrun) {
					console.log('[V] Input file:', fileName)
					console.log('[V] Relative dir:', dirName)
					console.log('[V] Relative input path:', filePath)
					console.log('[V] Generated class name:', className)
					console.log('[V] Generated namesace:', nameSpace)
				}

				const [, result] = compile([filePath, {className, nameSpace, source}])
				$results.set(filePath, result)

				reCompiledFileCount += 1
				if (reCompiledFileCount >= changedFiles.size) writeOutput({$results, dest, currentVersion}, {verbose, dryrun})
			}

			for (let file of removedFiles) {
				const filePath = path.relative(dir, file)
				$results.delete(filePath)
			}

			for (let file of changedFiles) fs.readFile(file, 'utf8', handleFileRead(file))

			changedFiles.clear()
			removedFiles.clear()
		}
	}

	const fileUpdated = (file) => {
		clearTimeout(debounceTimerID)
		console.log(`File detected: ${file}`)
		changedFiles.add(file)
		removedFiles.delete(file)
		debounceTimerID = setTimeout(regenerate, debounce * 1000)
	}
	const fileUnlinked = (file) => {
		clearTimeout(debounceTimerID)
		console.log(`File removed: ${file}`)
		removedFiles.add(file)
		changedFiles.delete(file)
		debounceTimerID = setTimeout(regenerate, debounce * 1000)
	}

	return {fileUpdated, fileUnlinked}
}

const fileWatcher = ({dir, debounce, outPath, seperate, ignores, extensionName, extraTypeDef}, {verbose, dryrun}) => {
	const {fileUpdated, fileUnlinked} = getHandlers({dir, debounce, outPath, seperate, ignores, extensionName, extraTypeDef}, {verbose, dryrun})

	const watcher = chokidar.watch(['**/*.ef', '**/*.eft', '**/*.efml'], {
		cwd: dir,
		ignored: ignores,
		followSymlinks: false
	})

	watcher
	.on('add', fileUpdated)
	.on('change', fileUpdated)
	.on('unlink', fileUnlinked)

	console.log('Change watcher has started.')
}

module.exports = fileWatcher
