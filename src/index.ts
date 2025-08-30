import {
    Worker,
    parentPort,
    workerData,
} from 'worker_threads'

export type workerInfo = {
    input?: any,
    onMessage?: (message: any) => void,
    onError?: (error: Error) => void,
    onComplete?: (exitCode: number) => void,
    onMessageError?: (error: MessageEvent) => void,
    onOnline?: () => void
}

const NAME = 'workerShare';
const debug = false; // Triggers all WorkerShare classes and workers to log their communication 

export class WorkerShare {
    public data: Record<string | number, any>;
    private workerArr: (Worker | null)[] = [];
    public workers: number = 0;
    public onAllComplete: () => void = () => null;
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

    public messageAll(message: any) {
        if (debug) console.log(`(Parent) Sending to ${this.workers} workers`, message)
        this.workerArr.forEach((worker) => {
            worker?.postMessage(message)
        })
    }

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