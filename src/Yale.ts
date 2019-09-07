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

namespace API {
	const yaleAuthToken =
		'VnVWWDZYVjlXSUNzVHJhcUVpdVNCUHBwZ3ZPakxUeXNsRU1LUHBjdTpkd3RPbE15WEtENUJ5ZW1GWHV0am55eGhrc0U3V0ZFY2p0dFcyOXRaSWNuWHlSWHFsWVBEZ1BSZE1xczF4R3VwVTlxa1o4UE5ubGlQanY5Z2hBZFFtMHpsM0h4V3dlS0ZBcGZzakpMcW1GMm1HR1lXRlpad01MRkw3MGR0bmNndQ=='

	const enum Path {
		auth = 'o/token',
		panelMode = 'api/panel/mode',
		deviceStatus = 'api/panel/device_status',
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
		mode: Panel.Mode
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

export interface AccessToken {
	token: string
	expiration: Date
}

export async function authenticate(
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

export namespace Panel {
	export const enum Mode {
		arm = 'arm',
		home = 'home',
		disarm = 'disarm',
	}

	export async function getMode(accessToken: AccessToken): Promise<Mode> {
		let response = await API.getMode(accessToken.token)
		return processResponse(
			response,
			JSONDecoders.panelGetDecoder,
			(mode: JSONDecoders.PanelGetResponse[]) => {
				switch (
					mode[0].mode // TODO: bounds-checking
				) {
					case 'arm':
						return Mode.arm
					case 'home':
						return Mode.home
					case 'disarm':
						return Mode.disarm
					default:
						throw new Error('Something went wrong.')
				}
			}
		)
	}

	export async function setMode(
		accessToken: AccessToken,
		mode: Mode
	): Promise<Mode> {
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
}

export namespace Devices {
	export interface Device {
		identifier: string
		name: string
	}

	export namespace ContactSensor {
		export enum State {
			Open,
			Closed,
		}
	}

	function parseContactSensorState(
		value: string
	): ContactSensor.State | undefined {
		switch (value) {
			case 'device_status.dc_close':
				return ContactSensor.State.Closed
			case 'device.status.dc_open':
				return ContactSensor.State.Open
		}
	}

	export interface ContactSensor extends Device {
		state: ContactSensor.State
	}

	export namespace MotionSensor {
		export enum State {
			None,
			Triggered,
		}
	}

	function parseMotionSensorState(value: string): MotionSensor.State {
		switch (value) {
			case 'device_status.pir_triggered':
				return MotionSensor.State.Triggered
			default:
				return MotionSensor.State.None
		}
	}

	export interface MotionSensor extends Device {
		state: MotionSensor.State
	}

	export type Sensor = ContactSensor | MotionSensor

	function deviceToSensor(value: JSONDecoders.Device): Sensor | undefined {
		switch (value.type) {
			case 'device_type.door_contact':
				let state = parseContactSensorState(value.status)
				if (state != null) {
					return {
						identifier: value.id,
						name: value.name,
						state: state,
					}
				} else {
					return undefined
				}
			case 'device_type.pir':
				return {
					identifier: value.id,
					name: value.name,
					state: parseMotionSensorState(value.status),
				}
			default:
				return undefined
		}
	}

	const isPresent = <T>(value: T): value is NonNullable<T> => value != null

	export async function getSensors(
		accessToken: AccessToken
	): Promise<Sensor[]> {
		let response = await API.getDevices(accessToken.token)
		return processResponse(
			response,
			JSONDecoders.devicesDecoder,
			(devices: JSONDecoders.Device[]) => {
				return devices.map(deviceToSensor).filter(isPresent)
			}
		)
	}
}
