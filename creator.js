'use strict'
const fs = require('fs-extra')
const path = require('path')

const init = (destination = '.', overwrite = false) => {
	const realTplPath = path.resolve(__dirname, 'template')
	const realDestPath = path.resolve(destination)

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
