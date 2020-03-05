#!/usr/bin/env node

'use strict';

const { spawnSync } = require( 'child_process' );

const pack = require(__dirname + '/../package.json');

const name = pack.name + '-' + pack.version;

const gunzip = spawnSync('gunzip', [name + '.tgz']);
console.log('gunzip:' + gunzip.stdout.toString() + ' / ' + gunzip.stderr.toString());

const mv = spawnSync( 'mv', [name + '.tar', name + '.lke']);
console.log('mv:' + mv.stdout.toString() + ' / ' + mv.stderr.toString());


