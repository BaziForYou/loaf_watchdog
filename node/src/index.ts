import { Worker } from 'worker_threads'
import path from 'path'

const resourcePath = GetResourcePath(GetCurrentResourceName())
const separator = path.sep
const currentResource = GetCurrentResourceName()
const resourcesIndex = resourcePath.lastIndexOf('/resources')
const root = resourcePath.slice(0, resourcesIndex) + '/resources'
const config: {
    START_IF_NOT_STARTED: boolean
} = JSON.parse(LoadResourceFile(currentResource, 'config.json'))

const worker = new Worker(path.join(resourcePath, '/server/worker.js'))

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function onWorkerEvent<T>(event: string, callback: (data: T) => void) {
    worker.on('message', (message: { action: string; [key: string]: any }) => {
        if (message.action === event) {
            callback(message.data)
        }
    })
}

onWorkerEvent<any[]>('log', (data) => {
    console.log('^6[Watchdog]^7', ...data)
})

onWorkerEvent<string>('restartResource', async (resourceName) => {
    StopResource(resourceName)

    await delay(250)

    StartResource(resourceName)
})

onWorkerEvent<string>('stopResource', (resourceName) => {
    StopResource(resourceName)
})

onWorkerEvent('refreshResources', () => {
    ExecuteCommand('refresh')
})

onWorkerEvent<{ id: number; resourceName: string }>('getResourceState', (data) => {
    const state = GetResourceState(data.resourceName)

    worker.postMessage({
        action: 'response',
        id: data.id,
        data: state
    })
})

worker.on('error', (error) => {
    console.error('Worker error:', error)
})

worker.postMessage({
    action: 'watch',
    data: {
        root,
        currentResource,
        separator,
        config
    }
})
