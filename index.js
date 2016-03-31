#! /usr/bin/env node

var fs = require('fs')
var minimist = require('minimist')
var flatten = require('lodash.flatten')
var findindex = require('lodash.findindex')

var argv = minimist(process.argv.slice(2), {
  alias: {
    c: 'classname',
    o: 'output',
    t: 'title',
    h: 'help'
  }
})

var usage = `
usage:
  myops <source> -o <output> -c <classname>

options:
  --classname, -c     name of class
  --output, -o        name of output file
  --title, -t         title for result
  --help, -h          show this help message
`

if (argv.help) {
  console.log(usage)
  process.exit()
}

var source = argv._[0]

if (!source) throw Error('must specify a source file')

var contents = String(fs.readFileSync(source)).split('\n')
var classname = argv.classname
var title = argv.title ? argv.title : (argv.classname ? argv.classname : null)
var output = argv.output

var ind, tab, indent
if (classname) {
  ind = findindex(contents, function (line) {
    return line.indexOf('class ' + classname) > -1
  })
  indent = 2
  tab = '    '
} else {
  ind = 0
  indent = 1
  tab = ''
}

var results = []
var start, line, previous, cond1, cond2, signature, docstring, i, j, k

if (ind < 0) throw Error('no content found, double check class name?')

for (i = ind; i < contents.length; i++) {
  line = contents[i]
  previous = (i > 0) ? contents[i - 1] : contents[i]
  cond1 = line.indexOf(tab + 'def') === 0
  cond2 = line.indexOf(tab + 'def _') === -1 && previous.indexOf(tab + '@') === -1
  if (cond1 && cond2) {
    signature = line.slice(indent * 4, line.length)
    signature = signature.slice(0, signature.length - 1)
    if (classname) signature = signature.replace('self, ', '')
    for (j = i + 2; j < contents.length; j++) {
      if (contents[j].indexOf(tab + tab + '"""') > -1) break
    }
    docstring = contents.slice(i + 2, j)
    docstring = docstring.map(function (line) {
      return line.slice(indent * 4, line.length)
    }).filter(function (line) {
      return (line !== '----------' && line !== 'Parameters')
    }).map(function (line) {
      if (line.indexOf('    ') === 0) return line.slice(4, line.length)
      else return line
    }).map(function (line) {
      if (line.indexOf(' : ') > -1) {
        start = line.indexOf(' : ')
        line = '- **`' + line.slice(0, start) + '`**' + ' ' + '`' + line.slice(start + 1, line.length).split(', ').join('` `') + '`' + '\n'
        line = line.replace('`: ', '`')
        return line
      } else {
        return line
      }
    })
    for (k = 0; k < docstring.length; k++) {
      if (docstring[k].indexOf('-') === 0) {
        docstring[k + 1] = '   ' + docstring[k + 1]
      }
    }
    results.push({
      signature: signature,
      docstring: docstring
    })
  }
}

var final = []
results.forEach(function (func) {
  final.push(['', '#### `' + func.signature + '`', ''])
  final.push(func.docstring)
})

var flattened = flatten(final)
flattened = flattened.slice(1, flattened.length)
if (title) flattened = ['## ' + title, ''].concat(flattened)

if (output) fs.writeFileSync(output, flattened.join('\n'))
else console.log(flattened.join('\n'))
