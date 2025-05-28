import chokidar from 'chokidar'
import path from 'path'

const COLORS = {
    add: '^2+',
    change: 'Modified ^5',
    unlink: '^1-'
} as const

const separator = path.sep
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function restartResource(resourceName: string) {
    StopResource(resourceName)

    await delay(250)

    StartResource(resourceName)
}

const currentResource = GetCurrentResourceName()
const resourcePath = GetResourcePath(currentResource)
const resourcesIndex = resourcePath.lastIndexOf('/resources')
const root = resourcePath.slice(0, resourcesIndex) + '/resources'
const config: {
    START_IF_NOT_STARTED: boolean
    DELETE_ENTITIES: boolean
} = JSON.parse(LoadResourceFile(currentResource, 'config.json'))

let debouncedRestart: NodeJS.Timeout | null = null

chokidar
    .watch(`${root}/**/*.lua`, {
        persistent: true,
        ignored: ['**/node_modules', '**/.git', '**/ui', '**/html', '**/uploads'],
        ignoreInitial: true
    })
    .on('all', async (event, path) => {
        const parts = path
            .replace(`${root}/`.replaceAll('/', separator), '')
            .split(separator)
            .filter((part) => part !== 'resources' && part[0] !== '[' && part[part.length - 1] !== ']')

        const resourceName = parts[0]

        if (!resourceName) {
            return console.log(`^1[ERROR]^7 Could not find resource name for ${path}`)
        }

        if (resourceName === currentResource) {
            return
        }

        const fileName = parts.slice(1).join('/')

        if (GetResourceState(resourceName) !== 'started' && !config.START_IF_NOT_STARTED) {
            return console.log(`${resourceName} is not started`)
        }

        const timeoutId = setTimeout(() => {
            if (debouncedRestart !== timeoutId) {
                return
            }

            debouncedRestart = null

            if (parts[1] === 'fxmanifest.lua' || event === 'add') {
                console.log('^6[Watchdog]^7 Refreshing resources & files')

                ExecuteCommand('refresh')
            }

            console.log(`^6[Watchdog]^7 Restarting resource ^4${resourceName}^7`)

            restartResource(resourceName)
        }, 500)

        debouncedRestart = timeoutId

        console.log(`^6[Watchdog]^7 Resource ^4${resourceName}^7 changed. ${COLORS[event] ?? ''}${fileName}^7`)
    })
