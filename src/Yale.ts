/*!
	MIT License

	https://github.com/jonathandann/yalesyncalarm
	Copyright (c) 2019 Jonathan Dann

	Forked from https://github.com/jonathan-fielding/yalealarmsystem
	Copyright 2019 Jonathan Fielding, Jack Mellor & Adam Green

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

import * as NodeFetch from 'node-fetch'
import { JSONDecoders } from './Decoders'
import { Decoder } from 'type-safe-json-decoder'
import {
	AccessToken,
	ContactSensor,
	Panel,
	MotionSensor,
	Sensor,
	DoorLock,
} from './Model'
import { ILogger, Logger } from './Logger'
import AwaitLock from 'await-lock'
import lock from './Lock'

namespace API {
	const yaleAuthToken =
		'VnVWWDZYVjlXSUNzVHJhcUVpdVNCUHBwZ3ZPakxUeXNsRU1LUHBjdTpkd3RPbE15WEtENUJ5ZW1GWHV0am55eGhrc0U3V0ZFY2p0dFcyOXRaSWNuWHlSWHFsWVBEZ1BSZE1xczF4R3VwVTlxa1o4UE5ubGlQanY5Z2hBZFFtMHpsM0h4V3dlS0ZBcGZzakpMcW1GMm1HR1lXRlpad01MRkw3MGR0bmNndQ=='

	const enum Path {
		auth = 'o/token',
		panelMode = 'api/panel/mode',
		deviceStatus = 'api/panel/device_status',
		services = 'services',
		unlock = 'api/minigw/unlock/',
		deviceControl = 'api/panel/device_control/'
	}

	function url(path: Path): string {
		return `https://mob.yalehomesystem.co.uk/yapi/${path}/`
	}

	export async function authenticate(
		username: string,
		password: string
	): Promise<NodeFetch.Response> {
		return await NodeFetch.default(url(Path.auth), {
			method: 'POST',
			body: `grant_type=password&username=${encodeURIComponent(
				username
			)}&password=${encodeURIComponent(password)}`,
			headers: {
				Authorization: `Basic ${yaleAuthToken}`, // without this, error === 'invalid_client'
				'Content-Type': 'application/x-www-form-urlencoded ; charset=utf-8',
			},
		})
	}

	export async function getServices(
		accessToken: string
	): Promise<NodeFetch.Response> {
		return await NodeFetch.default(url(Path.services), {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
	}

	export async function getMode(
		accessToken: string
	): Promise<NodeFetch.Response> {
		return await NodeFetch.default(url(Path.panelMode), {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
	}

	export async function setMode(
		accessToken: string,
		mode: Panel.State
	): Promise<NodeFetch.Response> {
		return await NodeFetch.default(url(Path.panelMode), {
			method: 'POST',
			body: `area=1&mode=${mode}`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/x-www-form-urlencoded ; charset=utf-8',
			},
		})
	}

	export async function setLockState(
		accessToken: string,
		doorLock: DoorLock,
		pincode: string,
		mode: DoorLock.State
	): Promise<NodeFetch.Response> {
		switch (mode) {
			case 0:
				return await NodeFetch.default(url(Path.deviceControl), {
					method: 'POST',
					body: `area=${doorLock.area}&zone=${doorLock.zone}&device_sid=${doorLock.sid}&device_type=${doorLock.type}&request_value=1`,
					headers: {
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': 'application/x-www-form-urlencoded ; charset=utf-8',
					},
				})
			default:
				return await NodeFetch.default(url(Path.unlock), {
					method: 'POST',
					body: `area=${doorLock.area}&zone=${doorLock.zone}$pincode=${pincode}`,
					headers: {
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': 'application/x-www-form-urlencoded ; charset=utf-8',
					},
				})
		}
	}

	export async function getDevices(
		accessToken: string
	): Promise<NodeFetch.Response> {
		return await NodeFetch.default(url(Path.deviceStatus), {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
	}
}

async function authenticate(
	username: string,
	password: string
): Promise<AccessToken> {
	let response = await API.authenticate(username, password)
	return await processResponse(
		response,
		JSONDecoders.accessTokenDecoder,
		(accessToken: JSONDecoders.AccessToken) => {
			let expiration = new Date()
			expiration.setSeconds(expiration.getSeconds() + accessToken.expiration)
			return {
				token: accessToken.token,
				expiration: expiration,
			}
		}
	)
}

async function processResponse<T, U>(
	response: NodeFetch.Response,
	decoder: Decoder<T>,
	success: (decoded: T) => U
): Promise<U> {
	if (response.status === 200) {
		let decoded = decoder.decodeAny(await response.json())
		return success(decoded)
	} else if (response.status >= 400 && response.size < 500) {
		/**
			So far we've seen the following errors: 
			HTTP 400 'invalid_request' (missing username or password)
			HTTP 400 'unsupported_grant_type' (missing grant_type in request body)
			HTTP 401 'invalid_grant' (incorrect username or password)
		*/
		let error = JSONDecoders.errorDecoder.decodeAny(await response.json())
		if (error.description) {
			throw new Error(
				`HTTP ${response.status} "${error.error}", "${error.description}"`
			)
		} else {
			throw new Error(
				`HTTP ${response.status} "${error.error}", No description given.`
			)
		}
	}
	throw new Error(`Unhandled HTTP status code: ${response.status}`)
}

export async function getMode(accessToken: AccessToken): Promise<Panel.State> {
	let response = await API.getMode(accessToken.token)
	return processResponse(
		response,
		JSONDecoders.panelGetDecoder,
		(mode: JSONDecoders.PanelGetResponse[]) => {
			switch (
				mode[0].mode // TODO: bounds-checking
			) {
				case 'arm':
					return Panel.State.Armed
				case 'home':
					return Panel.State.Home
				case 'disarm':
					return Panel.State.Disarmed
				default:
					throw new Error('Something went wrong.')
			}
		}
	)
}

async function getServices(
	accessToken: AccessToken
): Promise<JSONDecoders.ServicesResponse> {
	let response = await API.getServices(accessToken.token)
	return processResponse(
		response,
		JSONDecoders.servicesDecoder,
		servicesJSON => {
			return servicesJSON
		}
	)
}

// TODO: move to JSONDecoders
function parseContactSensorState(
	value: string
): ContactSensor.State | undefined {
	switch (value) {
		case 'device_status.dc_close':
			return ContactSensor.State.Closed
		case 'device_status.dc_open':
			return ContactSensor.State.Open
	}
}

// TODO: move to JSONDecoders
function parseMotionSensorState(value: string): MotionSensor.State {
	switch (value) {
		case 'device_status.pir_triggered':
			return MotionSensor.State.Triggered
		default:
			return MotionSensor.State.None
	}
}

// TODO: move to JSONDecoders
function parseLockedState(value: string): DoorLock.State {
	switch (value) {
		case 'device_status.lock':
			return DoorLock.State.locked
		case 'device_status.unlock':
			return DoorLock.State.unlocked
		default:
			return DoorLock.State.unlocked
	}
}

// TODO: move to JSONDecoders
function deviceToSensor(value: JSONDecoders.Device): Sensor | undefined {
	switch (value.type) {
		case 'device_type.door_contact':
			let state = parseContactSensorState(value.status)
			if (state !== undefined) {
				return new ContactSensor(value.identifier, value.name, state)
			} else {
				return undefined
			}
		case 'device_type.pir':
			return new MotionSensor(
				value.identifier,
				value.name,
				parseMotionSensorState(value.status)
			)
		case 'device_type.door_lock':
			return new DoorLock(
				value.identifier,
				value.name,
				value.area,
				value.zone,
				value.sid,
				value.type,
				parseLockedState(value.status),
			)
		default:
			return undefined
	}
}

const isPresent = <T>(value: T): value is NonNullable<T> => value != null

async function getSensors(accessToken: AccessToken): Promise<Sensor[]> {
	let response = await API.getDevices(accessToken.token)
	return processResponse(
		response,
		JSONDecoders.devicesDecoder,
		(devices: JSONDecoders.Device[]) => {
			return devices.map(deviceToSensor).filter(isPresent)
		}
	)
}

async function setMode(
	accessToken: AccessToken,
	mode: Panel.State
): Promise<Panel.State> {
	let response = await API.setMode(accessToken.token, mode)
	return processResponse(
		response,
		JSONDecoders.panelSetDecoder,
		(value: JSONDecoders.PanelSetResponse) => {
			if (value.acknowledgement === 'OK') {
				return mode
			} else {
				throw new Error('Something went wrong.')
			}
		}
	)
}

async function setLockState(
	accessToken: AccessToken,
	doorLock: DoorLock,
	pincode: string,
	mode: DoorLock.State,
): Promise<DoorLock.State> {
	let response = await API.setLockState(accessToken.token, doorLock, pincode, mode)
	return processResponse(
		response,
		JSONDecoders.doorLockSetDecoder,
		(value: JSONDecoders.DoorLockSetResponse) => {
			if (value.code === '000') {
				return mode
			} else {
				throw new Error('Something went wrong. Code: ' + value.code)
			}
		}
	)
}

export type ContactSensors = { [key: string]: ContactSensor }
export type MotionSensors = { [key: string]: MotionSensor }
export type DoorLocks = { [key: string]: DoorLock }

export class Yale {
	private _panel?: Panel

	private _contactSensors: ContactSensors = {}
	private _motionSensors: MotionSensors = {}
	private _doorLocks: DoorLocks = {}

	private _lock = new AwaitLock()

	public constructor(
		private readonly _username: string,
		private readonly _password: string,
		private readonly _pincode: string,
		private readonly _log: ILogger = new Logger()
	) {}

	private async _updatePanel(accessToken: AccessToken): Promise<Panel> {
		const identifier: string = await (async () => {
			if (this._panel === undefined) {
				const services = await getServices(accessToken)
				return services.panel
			} else {
				return this._panel.identifier
			}
		})()
		const panelState = await getMode(accessToken)
		this._panel = new Panel(identifier, 'Panel', panelState)
		return this._panel
	}

	private async _updateSensors(accessToken: AccessToken): Promise<void> {
		const sensors = await getSensors(accessToken)
		this._contactSensors = sensors.reduce<ContactSensors>((map, sensor) => {
			if (sensor instanceof ContactSensor) {
				map[sensor.identifier] = sensor
			}
			return map
		}, {})
		this._motionSensors = sensors.reduce<MotionSensors>((map, sensor) => {
			if (sensor instanceof MotionSensor) {
				map[sensor.identifier] = sensor
			}
			return map
		}, {})
		this._doorLocks = sensors.reduce<DoorLocks>((map, sensor) => {
			if (sensor instanceof DoorLock) {
				map[sensor.identifier] = sensor
			}
			return map
		}, {})
	}

	public async update(): Promise<void> {
		return await lock(this._lock, async () => {
			const accessToken = await authenticate(this._username, this._password)
			await this._updatePanel(accessToken)
			await this._updateSensors(accessToken)
		})
	}

	public async panel(): Promise<Panel | undefined> {
		return await lock(this._lock, async () => {
			return this._panel
		})
	}

	public async motionSensors(): Promise<MotionSensors> {
		return await lock(this._lock, async () => {
			return this._motionSensors
		})
	}

	public async contactSensors(): Promise<ContactSensors> {
		return await lock(this._lock, async () => {
			return this._contactSensors
		})
	}

	public async doorLocks(): Promise<DoorLocks> {
		return await lock(this._lock, async () => {
			return this._doorLocks
		})
	}

	public async getPanelState(): Promise<Panel.State> {
		return await lock(this._lock, async () => {
			const accessToken = await authenticate(this._username, this._password)
			return (await this._updatePanel(accessToken)).state
		})
	}

	public async setPanelState(targetState: Panel.State): Promise<Panel.State> {
		return await lock(this._lock, async () => {
			const accessToken = await authenticate(this._username, this._password)
			const panelState = await setMode(accessToken, targetState)
			if (this._panel === undefined) {
				// TODO: this should actually throw, we're in a weird state where we have
				// no panel, but we're trying to set a state. update() should have been called
				// first.
				return (await this._updatePanel(accessToken)).state
			} else {
				this._panel = new Panel(
					this._panel.identifier,
					this._panel.name,
					panelState
				)
				return panelState
			}
		})
	}

	public async setDoorLockState(doorLock: DoorLock, targetState: DoorLock.State): Promise<DoorLock.State> {
		return await lock(this._lock, async () => {
			const accessToken = await authenticate(this._username, this._password)
			const state = await setLockState(accessToken, doorLock, this._pincode, targetState)

			await this.updateDoorLock(doorLock)

			return state
		})
	}

	public async updateMotionSensor(
		sensor: MotionSensor
	): Promise<MotionSensor | undefined> {
		return await lock(this._lock, async () => {
			const accessToken = await authenticate(this._username, this._password)
			await this._updateSensors(accessToken)
			return this._motionSensors[sensor.identifier]
		})
	}

	public async updateContactSensor(
		sensor: ContactSensor
	): Promise<ContactSensor | undefined> {
		return await lock(this._lock, async () => {
			const accessToken = await authenticate(this._username, this._password)
			await this._updateSensors(accessToken)
			return this._contactSensors[sensor.identifier]
		})
	}

	public async updateDoorLock(
		doorLock: DoorLock
	): Promise<DoorLock | undefined> {
		return await lock(this._lock, async () => {
			const accessToken = await authenticate(this._username, this._password)
			await this._updateSensors(accessToken)
			return this._doorLocks[doorLock.identifier]
		})
	}
}
