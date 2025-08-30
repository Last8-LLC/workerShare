# workerShare
Object sharing between multiple node worker threads and their parents.

## class WorkerShare
Class to create workers and share data with them.
### `constructor(data: Record<string | number, any>)`
Creates a workerShare class with the data object. Note the data object must be serializable, so it cannot contain objects within the object.
### `WorkerShare.data`
A proxy of the orginal data that automatically notifies workers of updates. Should be used when the parent alters the data.
### `WorkerShare.hire(url: string | URL, workerData)`
Creates a new worker at the url listed, subscribing it to the parent's data. Returns the worker.
#### `workerData.input?`
Input to be passed into the worker as worker-threads.workerData.input. Note that the value cannot be an Object. If you want to send an object, convert it into JSON and parse the JSON in the worker.
#### `workerData.onMessage(message: any)?`
Function called whenever a message is recieved from the worker that is not data sync.
#### `workerData.onError(error: Error)?`
Function called when the worker errors.
#### `workerData.onComplete(exitCode: number)?`
Function called when the worker completes, after it is unsubscribed from the parent's data.
#### `workerData.onOnline()?`
Function called when the worker is online.
#### `workerData.onMessageError(error: MessageError)?`
Function called when the worker throws a message error.
### `WorkerShare.messageAll(message)`
Posts a message to all workers.
### `WorkerShare.workers`
An array of workers hired by the method.

## `function receiveData(onMessageEvent): Record<string|number, any>`
Function that should be called by the worker thread to process data. Returns the subscribed data. 
### `onMessageEvent?: (message) => void` param
Function called whenever a message is received from the parent that is not data sync.

## Installation
`npm i workerShare`

## Using the package
Import the class from `workershare` in your main thread, and import `receiveData` in your worker threads. When using the input data in a worker thread, note that it is located at workerData.input so that the inital value of the shared data can also be sent.

Note that only setting a property and deleting it will properly update the parent. `Object.defineProperty` and `Object.setPropertyOf` are not caught and transmitted to parent, and direct assignment to the object will unsubscribe the object.

Additonally, as both workerData and the shared data are themselves objects, workerData.input and properties of the shared data cannot be object, it will throw an error. As well, messages sent between the parent and the worker with a `sender` property set to `workerShare` will be caught and treated as a data sync message. Message events passed into the worker through the recieveData function's onMessageEvent and WorkerData.hire's onMessage will not recieve the message.


## Contribution and License
Contributions are appreciated. If you spot a bug or want another feature, create an issue.

If you are contributing or forking the software, note that the tests are not written as unit tests. To properly run the tests, change `debug` in the main file to true. 

This code is licensed under the __MIT__ License.

Copyright © 2025 Last8

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
