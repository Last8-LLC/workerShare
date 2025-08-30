import { WorkerShare, receiveData } from '../';
import { isMainThread, parentPort, workerData } from 'worker_threads'

function wait(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time * 1000));
}

// Before preforming tests, enable `debug` in src/index.ts


if (isMainThread) {
  console.log('Running tests...');
  let workerShare = new WorkerShare({value: 4});
  workerShare.hire(__filename, {input: 'Hello', onComplete(exitCode) { console.log(workerShare.workers.length, exitCode) }})

  async function doStuff() {
    await wait(2);
    console.log('\x1b[36m (Parent): ', workerShare.data, '\x1b[0m')
    workerShare.data['Hi'] = 'England';
    workerShare.hire(__filename, {input: 'Bye', onMessage(value) {
      console.log('\x1b[35m (Parent): Received from Child:', value, '\x1b[0m');
      workerShare.workers[0]?.postMessage(`Bye`)
    },})
  }
  doStuff()

} else {
  let data = receiveData((message) => console.log('\x1b[35m (Child) Received from Parent:', message, '\x1b[0m'));
  async function doStuff() {
    await wait(1);
    data[workerData.input] = 'America'
    parentPort?.postMessage('Hi!')
    await wait(4);
    data[workerData.input] = 'France'
    // delete data[workerData.input];
    console.log('\x1b[36m', data, '\x1b[0m')
    // Test exiting
    parentPort?.close()
  }
  doStuff()
}