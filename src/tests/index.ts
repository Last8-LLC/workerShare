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
    workerShare.hire(__filename, {input: 'Bye'})
  }
  doStuff()

} else {
  let data = receiveData((message)=>console.log(message));
  async function doStuff() {
    await wait(1);
    data[workerData.input] = 'America'
    await wait(4);
    data[workerData.input] = 'France'
    // delete data[workerData.input];
    console.log('\x1b[36m', data, '\x1b[0m')
    // Test exiting
    parentPort?.close()
  }
  doStuff()
}