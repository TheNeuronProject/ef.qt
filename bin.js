#!/usr/bin/env node
'use strict'

const yargs = require('yargs')

const generate = require('./generator.js')
const init = require('./creator.js')

yargs
.command('init [dest]', 'create a new ef.qt project', (yargs) => {
	yargs
	.positional('dest', {
		describe: 'destinaion directory to put template in',
		default: '.',
		type: 'string'
	})
	.option('o', {
		alias: 'overwrite',
		demandOption: false,
		describe: 'overwrite existing file',
		type: 'bool'
	})
}, (argv) => {
	init(argv.dest, !!argv.overwrite)
})
.command('generate', 'scan templates and generate C++ code', (yargs) => {
	yargs
	.option('d', {
		alias: 'dir',
		demandOption: false,
		default: '.',
		describe: 'scan from which folder',
		type: 'string'
	})
	.option('o', {
		alias: 'output',
		demandOption: false,
		default: 'ef.hpp',
		describe: 'output file for generated code',
		type: 'string'
	})
	.option('i', {
		alias: 'ignore',
		demandOption: false,
		default: [],
		describe: 'folders to be ignored during scan',
		type: 'array'
	})
}, (argv) => {
	generate(argv.dir, argv.output, argv.ignore)
})
.help('h')
.alias('h', 'help')
.demandCommand()
.recommendCommands()
.strict()
.parse()
