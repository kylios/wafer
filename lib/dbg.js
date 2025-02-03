import process from 'node:process'

function lvl(level) {
  for (var i = 0; i < level; i++) {
    process.stdout.write('  ')
  }
}

export function print(obj, level=0) {
  if (obj instanceof Map) {
    printMap(obj, level)
  } else if (obj instanceof Object) {
    printObj(obj, level)
  } else {
    lvl(level)
    process.stdout.write(`${obj}`)
    process.stdout.write("\n")
  }
}

function printMap(map, level=0) {
  map.entries().forEach(([key, value]) => {
    lvl(level)
    console.log(`Key: ${key}`)
    lvl(level)
    console.log('Value:')
    print(value, level + 1)
  })
}

function printObj(obj, level=0) {
  Object.entries(obj).forEach(([key, value]) => {
    lvl(level)
    console.log(`Key: ${key}`)
    lvl(level)
    console.log('Value:')
    print(value, level + 1)
  })
}


