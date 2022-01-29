/*!
	MIT License

	https://github.com/jonathandann/blink
	Copyright (c) 2019 Jonathan Dann

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

export class AccessToken {
	public constructor(readonly token: string, readonly expiration: Date) {}
}

export interface Device {
	identifier: string
	name: string
}

export class Panel implements Device {
	public constructor(
		readonly identifier: string,
		readonly name: string,
		readonly state: Panel.State
	) {}
}

export namespace Panel {
	export const enum State {
		Armed = 'arm',
		Home = 'home',
		Disarmed = 'disarm',
	}
}

export class ContactSensor implements Device {
	public constructor(
		readonly identifier: string,
		readonly name: string,
		readonly state: ContactSensor.State
	) {}
}

export namespace ContactSensor {
	export enum State {
		Closed = 0,
		Open = 1,
	}
}

export class MotionSensor implements Device {
	public constructor(
		readonly identifier: string,
		readonly name: string,
		readonly state: MotionSensor.State
	) {}
}

export namespace MotionSensor {
	export enum State {
		None = 0,
		Triggered = 1,
	}
}

export class DoorLock implements Device {
	public constructor(
		readonly identifier: string,
		readonly name: string,
		readonly state: DoorLock.State
	) {}
}

export namespace DoorLock {
	// Add support for all states https://developers.homebridge.io/#/characteristic/LockCurrentState
	export enum State {
		locked = 0,
		unlocked = 1,
	}
}

export type Sensor = ContactSensor | MotionSensor | DoorLock
