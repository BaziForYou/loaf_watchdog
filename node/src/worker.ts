import { parentPort } from 'worker_threads'
import { existsSync } from 'node:fs'
import chokidar from 'chokidar'

const COLORS = {
    add: '^2+',
    change: 'Modified ^5',
    unlink: '^1-'
} as const

let debouncedRestart: NodeJS.Timeout | null = null
let nextId = 0

const messageQueue = new Map<number, (response: any) => void>()

function triggerEvent(action: string, data?: any) {
    if (!parentPort) return

    parentPort.postMessage({ action, data })
}

function print(...args: any[]) {
    if (!parentPort) return

    triggerEvent('log', [...args])
}

async function getResourceState(resourceName: string): Promise<string> {
    return new Promise((resolve) => {
        const id = nextId++

        messageQueue.set(id, resolve)

        triggerEvent('getResourceState', { resourceName, id })
    })
}

function watch(data: {
    root: string
    currentResource: string
    separator: string
    config: {
        START_IF_NOT_STARTED: boolean
    }
}) {
    if (!parentPort) return

    const { root, currentResource, separator, config } = data

    chokidar
        .watch(`${root}${separator}`, {
            ignored: [
                '**/node_modules',
                '**/.git',
                '**/ui',
                '**/html',
                '**/uploads',
                '**/stream',
                (filePath: string) => {
                    const basename = filePath.split(separator).pop()
                    const dotIndex = basename?.lastIndexOf('.')

                    return dotIndex !== -1 && !basename?.endsWith('.lua')
                }
            ],
            persistent: true,
            ignoreInitial: true
        })
        .on('all', async (event, path) => {
            if (event !== 'add' && event !== 'change' && event !== 'unlink') return

            const parts = path
                .replace(`${root}/`.replaceAll('/', separator), '')
                .split(separator)
                .filter((part) => part !== 'resources' && part[0] !== '[' && part[part.length - 1] !== ']')

            const resourceName = parts[0]

            if (!resourceName) {
                return print(`^1[ERROR]^7 Could not find resource name for ${path}`)
            } else if (resourceName === currentResource) {
                return
            } else if (!config.START_IF_NOT_STARTED && (await getResourceState(resourceName)) !== 'started') {
                return print(`Resource ^4${resourceName}^7 is not started. Ignoring changes.`)
            }

            const relativeFilePath = parts.slice(1).join('/')

            if (relativeFilePath === 'fxmanifest.lua' && event == 'unlink') {
                print(`Resource ^4${resourceName}^7 was removed. Stopping.`)
                triggerEvent('refreshResources')
                triggerEvent('stopResource', resourceName)

                return
            }

            if (debouncedRestart) clearTimeout(debouncedRestart)

            debouncedRestart = setTimeout(() => {
                debouncedRestart = null

                if (relativeFilePath === 'fxmanifest.lua' || event === 'add') {
                    print('Refreshing resources & files')
                    triggerEvent('refreshResources')
                }

                const allParts = path.split(separator)
                const resourceIndex = allParts.findIndex((part) => part === resourceName)
                const resourcePath = allParts.slice(0, resourceIndex + 1).join(separator)

                if (relativeFilePath !== 'fxmanifest.lua' && !existsSync(`${resourcePath}${separator}fxmanifest.lua`)) {
                    print(`Resource ^4${resourceName}^7 does not have an fxmanifest.lua. Ignoring changes.`)
                    return
                }

                print(`Restarting resource ^4${resourceName}^7`)
                triggerEvent('restartResource', resourceName)
            }, 500)

            print(`Resource ^4${resourceName}^7 changed. ${COLORS[event] ?? ''}${relativeFilePath}^7`)
        })
}

parentPort!.on('message', (message: { action: string; id?: number; data: any }) => {
    const { action, id, data } = message

    if (id) {
        const cb = messageQueue.get(id)

        cb?.(data)

        messageQueue.delete(id)

        return
    }

    if (action === 'watch') watch(data)
})
