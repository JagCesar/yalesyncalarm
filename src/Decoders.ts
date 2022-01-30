/*!
	MIT License

	https://github.com/jonathandann/yalesyncalarm
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

import {
	Decoder,
	at,
	array,
	object,
	number,
	string,
} from 'type-safe-json-decoder'

export namespace JSONDecoders {
	export interface ServicesResponse {
		panel: string
	}

	export const servicesDecoder: Decoder<ServicesResponse> = object(
		['panel', string()],
		panel => ({
			panel,
		})
	)

	export interface Device {
		identifier: string
		name: string
		area: string
		zone: string
		sid: string
		type: string
		status: string
	}

	export const devicesDecoder: Decoder<Device[]> = at(
		['data'],
		array(
			object(
				['device_id', string()],
				['name', string()],
				['area', string()],
				['no', string()],
				['address', string()],
				['type', string()],
				['status1', string()],
				(identifier, name, area, zone, sid, type, status) => ({ identifier, name, area, zone, sid, type, status })
			)
		)
	)

	export interface AccessToken {
		token: string
		expiration: number
	}

	export const accessTokenDecoder: Decoder<AccessToken> = object(
		['access_token', string()],
		['expires_in', number()],
		(token, expiration) => ({ token, expiration })
	)

	export interface PanelSetResponse {
		acknowledgement: string
	}

	export const panelSetDecoder: Decoder<PanelSetResponse> = at(
		['data'],
		object(['cmd_ack', string()], acknowledgement => ({ acknowledgement }))
	)

	export interface PanelGetResponse {
		area: string
		mode: string
	}

	export const panelGetDecoder: Decoder<PanelGetResponse[]> = at(
		['data'],
		array(
			object(['area', string()], ['mode', string()], (area, mode) => ({
				area,
				mode,
			}))
		)
	)

	export interface Error {
		error: string
		description?: string // Not all API responses contain an error_description field.
	}

	export const errorDecoder: Decoder<Error> = object(
		['error', string()],
		['error_description', string()],
		(error, description) => ({ error, description })
	)
}
