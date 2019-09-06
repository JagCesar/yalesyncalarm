import {
	Decoder,
	at,
	array,
	object,
	number,
	string,
} from 'type-safe-json-decoder'
import { access } from 'fs'

export namespace JSONDecoders {
	export interface Device {
		id: string
		name: string
		type: string
		status: string
	}

	export const devicesDecoder: Decoder<Device[]> = at(
		['data'],
		array(
			object(
				['device_id', string()],
				['name', string()],
				['type', string()],
				['status1', string()],
				(id, name, type, status) => ({ id, name, type, status })
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
