import * as NodeFetch from 'node-fetch'
import { JSONDecoders } from './Decoders'

export namespace Yale {
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

	/**
		So far we've seen the following errors: 
		HTTP 400 'invalid_request' (missing username or password)
		HTTP 400 'unsupported_grant_type' (missing grant_type in request body)
		HTTP 401 'invalid_grant' (incorrect username or password)
	*/
	export async function getAccessToken(
		username: string,
		password: string
	): Promise<string> {
		let body = `grant_type=password&username=${encodeURIComponent(
			username
		)}&password=${encodeURIComponent(password)}`

		let response = await NodeFetch.default(url(Path.auth), {
			method: 'POST',
			body: body,
			headers: {
				Authorization: `Basic ${yaleAuthToken}`, // without this, error === 'invalid_client'
				'Content-Type': 'application/x-www-form-urlencoded ; charset=utf-8',
			},
		})

		let json = await response.json()
		console.log(JSON.stringify(json))

		if (response.status === 200) {
			let accessToken = JSONDecoders.accessTokenDecoder.decodeAny(json) // TODO: Handle decoder throwing an error, when the response format inevitably changes.
			return accessToken.token
		}

		if (response.status >= 400) {
			let error = JSONDecoders.errorDecoder.decodeAny(json) // TODO: Handle decoder throwing an error, rethrow something useful.
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

		throw new Error('wow')
	}

	export const enum AlarmState {
		arm = 'arm',
		home = 'home',
		disarm = 'disarm',
	}

	export async function setStatus(
		accessToken: string,
		alarmState: AlarmState
	): Promise<boolean> {
		if (!accessToken || accessToken.length === 0) {
			throw new Error(
				'Please call getAccessToken to get your access token first.'
			)
		}

		let response = await NodeFetch.default(url(Path.panelMode), {
			method: 'POST',
			body: `area=1&mode=${alarmState}`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/x-www-form-urlencoded ; charset=utf-8',
			},
		})

		let json = await response.json()
		console.log(JSON.stringify(json))

		if (response.status === 200) {
			let status = JSONDecoders.panelSetDecoder.decodeAny(json)
			return status.acknowledgement === 'OK'
		}

		if (response.status >= 400) {
			let error = JSONDecoders.errorDecoder.decodeAny(json) // TODO: Handle decoder throwing an error, rethrow something useful.
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

		throw new Error('wow')
	}

	export async function getStatus(accessToken: string): Promise<AlarmState> {
		if (!accessToken || accessToken.length === 0) {
			throw new Error(
				'Please call getAccessToken to get your access token first.'
			)
		}

		let response = await NodeFetch.default(url(Path.panelMode), {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})

		let json = await response.json()
		console.log(JSON.stringify(json))

		if (response.status === 200) {
			let state = JSONDecoders.panelGetDecoder.decodeAny(json)
			switch (
				state[0].mode // TODO: bound-checking
			) {
				case 'arm':
					return AlarmState.arm
				case 'home':
					return AlarmState.home
				case 'disarm':
					return AlarmState.disarm
				default:
					throw new Error('wow')
			}
		}

		if (response.status >= 400) {
			let error = JSONDecoders.errorDecoder.decodeAny(json) // TODO: Handle decoder throwing an error, rethrow something useful.
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

		throw new Error('wow')
	}

	enum DeviceType {
		Contact,
		PIR,
		Siren,
		Keypad,
		Unknown,
	}

	enum DeviceStatus {
		None,
		Closed,
		Open,
	}

	export interface Device {
		identifier: string
		name: string
		type: DeviceType
		status: DeviceStatus
	}

	function convertStatus(status: string): DeviceStatus {
		switch (status) {
			case 'device_status.dc_close':
				return DeviceStatus.Closed
			case 'device.status.dc_open':
				return DeviceStatus.Open
			default:
				return DeviceStatus.None
		}
	}

	function convertType(type: string): DeviceType {
		switch (type) {
			case 'device_type.door_contact':
				return DeviceType.Contact
			case 'device_type.pir':
				return DeviceType.PIR
			case 'device_type.bx':
				return DeviceType.Siren
			case 'device_type.keypad':
				return DeviceType.Keypad
			default:
				return DeviceType.Unknown
		}
	}

	export async function getDevices(accessToken: string): Promise<Device[]> {
		if (!accessToken || accessToken.length === 0) {
			throw new Error(
				'Please call getAccessToken to get your access token first.'
			)
		}

		let response = await NodeFetch.default(url(Path.deviceStatus), {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})

		let json = await response.json()
		console.log(JSON.stringify(json))

		if (response.status === 200) {
			let devices = JSONDecoders.devicesDecoder.decodeAny(json)
			return devices.map(device => ({
				identifier: device.id,
				name: device.name,
				type: convertType(device.type),
				status: convertStatus(device.status),
			}))
		}

		if (response.status >= 400) {
			let error = JSONDecoders.errorDecoder.decodeAny(json) // TODO: Handle decoder throwing an error, rethrow something useful.
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

		throw new Error('wow')
	}
}
