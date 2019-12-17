'use strict'
const fs = require('fs-extra')
const path = require('path')

const init = (destination = '.', overwrite = false, {dryrun = false, verbose = false}) => {
	const realTplPath = path.resolve(__dirname, 'template')
	const realDestPath = path.resolve(destination)

	if (verbose || dryrun) {
		console.log('[V] Output dir:', destination)
		console.log('[V] Overwrite:', overwrite)
		console.log('[V] Template source path:', realTplPath)
		console.log('[V] Template output destination', realDestPath)
	}

	if (dryrun) {
		console.log(`ef.qt project has NOT been generated in \`${realDestPath}'. (--dryrun)`)
		return
	}

	fs.ensureDir(realDestPath, (err) => {
		if (err) throw err
		fs.copy(realTplPath, realDestPath, {
			overwrite: overwrite,
			errorOnExist: true
		}, (err) => {
			if (err) throw err
			console.log(`ef.qt project has been generated in \`${realDestPath}'`)
		})
	})
}

module.exports = init
