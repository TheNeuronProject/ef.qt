const chokidar = require('chokidar')
const path = require('path')
const {scanEntry, compileSingleFile, getSeperatedOutputFilePathWithRightExtension} = require('./scanner')

const getHandlers = ({dir, debounce, outPath, seperate, ignores, extensionName, extraTypeDef}, {verbose, dryrun}) => {
	let debounceTimerID = 0
	if (seperate) {
		if (outPath === 'ef.hpp') outPath = outPath = '.efgenerated/ef'
		ignores.push(outPath)
		const changedFiles = new Set()
		const regenerate = () => {
			for (let file of changedFiles) {
				const outFilePath = getSeperatedOutputFilePathWithRightExtension(file, extensionName)
				compileSingleFile({input: path.join(dir, file), output: path.join(outPath, outFilePath), base: dir, extraTypeDef}, {verbose, dryrun})
			}
			changedFiles.clear()
		}
		const fileUpdated = (file) => {
			console.log(`Change detected: ${file}`)
			changedFiles.add(file)
			clearTimeout(debounceTimerID)
			debounceTimerID = setTimeout(regenerate, debounce * 1000)
		}

		return {fileUpdated}
	} else {
		const regenerate = () => scanEntry({dir, outPath, seperate, ignores, extensionName, extraTypeDef}, {verbose, dryrun})
		const fileUpdated = (file) => {
			console.log(`Change detected: ${file}`)
			clearTimeout(debounceTimerID)
			debounceTimerID = setTimeout(regenerate, debounce * 1000)
		}

		return {fileUpdated}
	}
}

const fileWatcher = ({dir, debounce, outPath, seperate, ignores, extensionName, extraTypeDef}, {verbose, dryrun}) => {
	const {fileUpdated} = getHandlers({dir, debounce, outPath, seperate, ignores, extensionName, extraTypeDef}, {verbose, dryrun})

	const watcher = chokidar.watch(['**/*.ef', '**/*.eft', '**/*.efml'], {
		cwd: dir,
		ignored: ignores
	})

	watcher
	.on('add', fileUpdated)
	.on('change', fileUpdated)

	if (seperate) watcher.on('unlink', fileUpdated)

	console.log('Change watcher has started.')
}

module.exports = fileWatcher
