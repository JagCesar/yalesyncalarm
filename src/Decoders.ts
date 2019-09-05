import {
	Decoder,
	at,
	array,
	object,
	number,
	string,
} from 'type-safe-json-decoder'
import { access } from 'fs'

namespace JSON {
	interface Device {
		id: string
		name: string
		type: string
		status: string
	}

	const devicesDecoder: Decoder<Device[]> = at(
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

	interface AccessToken {
		token: string
		expiration: number
	}

	const accessTokenDecoder: Decoder<AccessToken> = object(
		['access_token', string()],
		['expires_in', number()],
		(token, expiration) => ({ token, expiration })
	)

	interface PanelSetResponse {
		acknowledgement: string
	}

	const panelSetDecoder: Decoder<PanelSetResponse> = at(
		['data'],
		object(['cmd_ack', string()], acknowledgement => ({ acknowledgement }))
	)

	interface PanelGetResponse {
		area: string
		mode: string
	}

	const panelGetDecoder: Decoder<PanelGetResponse> = at(
		['data'],
		object(['area', string()], ['mode', string()], (area, mode) => ({
			area,
			mode,
		}))
	)
}
