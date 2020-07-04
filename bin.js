#!/usr/bin/env node
'use strict'

const yargs = require('yargs')

const {scanEntry, compileSingleFile} = require('./scanner.js')
// const generate = require('./generator.js')
const watcher = require('./watcher.js')
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
.command('generate [dir]', 'scan templates and generate C++ code', (yargs) => {
	yargs
	.positional('dir', {
		default: '.',
		describe: 'which folder to scan from',
		type: 'string'
	})
	.option('o', {
		alias: 'output',
		demandOption: false,
		default: 'ef.hpp',
		describe: 'output file(or folder with -s) for generated code, default to `.efgenerated/ef\' with -s',
		type: 'string'
	})
	.option('s', {
		alias: 'seperate',
		demandOption: false,
		describe: 'seperate the generated header into headers for each template',
		type: 'bool'
	})
	.option('e', {
		alias: 'extension',
		demandOption: false,
		default: 'hpp',
		describe: 'generated header file extension, useful with -s',
		type: 'string'
	})
	.option('i', {
		alias: 'ignore',
		demandOption: false,
		default: [],
		describe: 'folders to be ignored during scan',
		type: 'array'
	})
	.option('c', {
		alias: 'extra-config',
		demandOption: false,
		default: '.efextraconfig',
		describe: 'Extra compiling config',
		type: 'string'
	})
}, (argv) => {
	scanEntry({
		dir: argv.dir,
		outPath: argv.output,
		seperate: argv.seperate,
		extensionName: argv.extension,
		ignores: argv.ignore,
		extraConfig: argv.extraconfig
	}, {
		verbose: argv.verbose,
		dryrun: argv.dryrun
	})
})
.command('compile <input> <output>', 'compile one template to one file', (yargs) => {
	yargs
	.positional('input', {
		describe: 'input file path',
		type: 'string'
	})
	.positional('output', {
		describe: 'output file path',
		type: 'string'
	})
	.option('b', {
		alias: 'base',
		demandOption: false,
		default: '.',
		describe: 'Base dir to the input file',
		type: 'string'
	})
	.option('c', {
		alias: 'extra-config',
		demandOption: false,
		default: '.efextraconfig',
		describe: 'Extra compiling config',
		type: 'string'
	})
}, (argv) => {
	compileSingleFile({
		input: argv.input,
		output: argv.output,
		base: argv.base,
		extraConfig: argv.extraconfig
	}, {
		verbose: argv.verbose,
		dryrun: argv.dryrun
	})
})
.command('watch [dir]', 'watch template file change and re-generate immediately', (yargs) => {
	yargs
	.positional('dir', {
		describe: 'directory to watch',
		default: '.',
		type: 'string'
	}).
	option('d', {
		alias: 'debounce',
		demandOption: false,
		default: 1,
		describe: 'debounce time before re-generate in seconds',
		type: 'number'
	})
	.option('o', {
		alias: 'output',
		demandOption: false,
		default: 'ef.hpp',
		describe: 'output file for generated code',
		type: 'string'
	})
	.option('s', {
		alias: 'seperate',
		demandOption: false,
		describe: 'seperate the generated header into headers for each template',
		type: 'bool'
	})
	.option('e', {
		alias: 'extension',
		demandOption: false,
		default: 'hpp',
		describe: 'generated header file extension, useful with -s',
		type: 'string'
	})
	.option('i', {
		alias: 'ignore',
		demandOption: false,
		default: [],
		describe: 'folders to be ignored during scan',
		type: 'array'
	})
	.option('c', {
		alias: 'extra-config',
		demandOption: false,
		default: '.efextraconfig',
		describe: 'Extra compiling config',
		type: 'string'
	})
}, (argv) => {
	watcher({
		dir: argv.dir,
		debounce: argv.debounce,
		outPath: argv.output,
		seperate: argv.seperate,
		extensionName: argv.extension,
		ignores: argv.ignore,
		extraConfig: argv.extraConfig
	}, {
		verbose: argv.verbose,
		dryrun: argv.dryrun
	})
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
