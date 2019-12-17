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
	init(argv.dest, !!argv.overwrite, {verbose: argv.verbose, dryrun: argv.dryrun})
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
	.option('e', {
		alias: 'extra',
		demandOption: false,
		default: '.eftypedef',
		describe: 'Extra param type definition',
		type: 'string'
	})
}, (argv) => {
	generate({dir: argv.dir, outFile: argv.output, ignores: argv.ignore, extraTypeDef: argv.extra}, {verbose: argv.verbose, dryrun: argv.dryrun})
})
.option('v', {
	alias: 'verbose',
	demandOption: false,
	describe: 'show verbose log',
	type: 'bool'
})
.option('D', {
	alias: 'dryrun',
	demandOption: false,
	describe: 'do everything but real modifications',
	type: 'bool'
})
.help('h')
.alias('h', 'help')
.demandCommand()
.recommendCommands()
.strict()
.completion()
.config()
.parse()
