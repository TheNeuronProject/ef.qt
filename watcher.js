const chokidar = require('chokidar')
const generator = require('./generator')

const fileWatcher = ({dir, debounce, outFile, ignores}, {verbose, dryrun}) => {
	let debounceTimerID = 0

	const regenerate = callback => generator({dir, outFile, ignores, callback}, {verbose, dryrun})
	const fileUpdated = (file) => {
		console.log(`Change detected: ${file}`)
		clearTimeout(debounceTimerID)
		debounceTimerID = setTimeout(regenerate, debounce * 1000)
	}

	const watcher = chokidar.watch(['**/*.ef', '**/*.eft', '**/*.efml'], {
		cwd: dir,
		ignored: ignores
	})

	watcher
	.on('add', fileUpdated)
	.on('change', fileUpdated)
	.on('unlink', fileUpdated)

	console.log('Change watcher has started.')
}

module.exports = fileWatcher
