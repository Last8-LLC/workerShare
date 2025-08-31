import {
    Worker,
    parentPort,
    workerData,
} from 'worker_threads'

/**
 * Defines the configuration for a worker thread.
 */
export type workerInfo = {
    /**
     * Optional data to pass to the worker's `workerData.input`.
     */
    input?: any,
    /**
     * An optional callback function that is called when the worker sends a message.
     * @param message The message received from the worker.
     */
    onMessage?: (message: any) => void,
    /**
     * An optional callback function that is called when an error occurs in the worker.
     * @param error The error that occurred.
     */
    onError?: (error: Error) => void,
    /**
     * An optional callback function that is called when the worker exits.
     * @param exitCode The exit code of the worker.
     */
    onComplete?: (exitCode: number) => void,
    /**
     * An optional callback function that is called when a message sent to the worker cannot be serialized.
     * @param error The message event error.
     */
    onMessageError?: (error: MessageEvent) => void,
    /**
     * An optional callback function that is called when the worker is online.
     */
    onOnline?: () => void
}

const NAME = 'workerShare';
const debug = false; // Triggers all WorkerShare classes and workers to log their communication 

/**
 * The `WorkerShare` class enables the sharing of data between the main thread and multiple worker threads.
 * It uses a `Proxy` to automatically synchronize data changes across all threads.
 */
export class WorkerShare {
    /**
     * A proxy object that holds the shared data. Any changes to this object are automatically propagated to all worker threads.
     */
    public data: Record<string | number, any>;
    private workerArr: (Worker | null)[] = [];
    /**
     * The current number of active worker threads.
     */
    public workers: number = 0;
    /**
     * A callback function that is called when all worker threads have completed their execution.
     */
    public onAllComplete: () => void = () => null;
    /**
     * Creates a new `WorkerShare` instance.
     * @param data An optional object to initialize the shared data with.
     */
    constructor(data: Record<string | number, any> = {}) {
        let workerShare = this;
        this.data = new Proxy(data, {
            set(target, property, value, receiver) {
                if(debug) console.log(`(Parent) Setting ${String(property)}->${value}`)
                workerShare.messageAll({
                    sender: NAME,
                    action: 'set',
                    property,
                    value
                })
                return Reflect.set(target, property, value, receiver);
            },
            deleteProperty(target, property) {
                if (debug) console.log(`(Parent) Deleting ${String(property)}`)
                workerShare.messageAll({
                    sender: NAME,
                    action: 'delete',
                    property
                })
                return Reflect.deleteProperty(target, property);
            },
        })
    }

    /**
     * Sends a message to all active worker threads.
     * @param message The message to send.
     */
    public messageAll(message: any) {
        if (debug) console.log(`(Parent) Sending to ${this.workers} workers`, message)
        this.workerArr.forEach((worker) => {
            worker?.postMessage(message)
        })
    }

    /**
     * Creates and starts a new worker thread.
     * @param url The URL of the worker script.
     * @param workerData The configuration for the new worker.
     * @returns The newly created `Worker` instance.
     */
    public hire(url: string | URL, workerData: workerInfo = {}) {
        if(debug) console.log(`(Parent): Hiring new worker from URL ${url} with`, workerData)
        let worker = new Worker(url, { workerData: { input: workerData.input, workerShare: JSON.stringify(this.data) } });
        let id = this.workerArr.push(worker);
        worker.on('message', (msg) => {
            if (debug) console.log('(Parent) From child: ', msg)
            // Handle proxy communication
            if (typeof msg === 'object' && msg.sender == NAME) {
                if (msg.action == 'set') {
                    this.data[msg.property] = msg.value;
                } else if (msg.action == 'delete') {
                    delete this.data[msg.property];
                }
            } else if (workerData.onMessage) workerData.onMessage(msg);
        });
        if (workerData.onError) worker.on('error', workerData.onError)
        worker.on('exit', (code) => {
            this.workerArr[id] = null;
            this.workers--;
        if(debug) console.log(`Worker exited, worker length now ${this.workers}`)
            if (this.workers == 0) this.onAllComplete()
            if (workerData.onComplete) workerData.onComplete(code)
        })
        if (workerData.onMessageError) worker.on('messageerror', workerData.onMessageError)
            

        if (workerData.onOnline) worker.on('online',
            workerData.onOnline
        );

        this.workers++;
        return worker;
    }
}

/**
 * This function is intended to be used within a worker thread. It sets up a proxy to synchronize data with the main thread.
 * @param onMessageEvent An optional callback function that is called when the worker receives a message from the main thread.
 * @returns A proxy object that represents the shared data.
 */
export function receiveData(onMessageEvent: (message: any) => void = () => null) {
    if(debug) console.log(`(Child) Initialized with`, workerData)
    const target: Record<string | number, any> = JSON.parse(workerData.workerShare) ?? {};
    const proxy = new Proxy(target, {
        set(target, property, value, receiver) {
            if (typeof property == "symbol" || target[property] == value) return Reflect.set(target, property, value, receiver); // Ignore setting when value has not changed
            if(debug) console.log(`(Child) Setting ${String(property)}->${value}`)
            parentPort?.postMessage({
                sender: NAME,
                action: 'set',
                property,
                value
            })
            return Reflect.set(target, property, value, receiver);
        },
        deleteProperty(target, property) {
            if(debug) console.log(`(Child) Deleting ${String(property)}`)
            parentPort?.postMessage({
                sender: NAME,
                action: 'delete',
                property,
            })
            return Reflect.deleteProperty(target, property)
        },
    })

    parentPort?.on('message', (msg: { sender: string, action: string, property: string | number, value: any }) => {
        if(debug) console.log(`(Child) From parent: `, msg)
        if (typeof msg === 'object' && msg.sender == NAME) {
            if (msg.action === 'set') {
                target[msg.property] = msg.value;
            } else if (msg.action === 'delete') {
                delete target[msg.property];
            }
        }
        else onMessageEvent(msg)
    });

    return proxy;
}