# Yale Sync & Smart Home Alarm API

![npm](https://img.shields.io/npm/v/yalesyncalarm)
[![Known Vulnerabilities](https://snyk.io//test/github/jonathandann/yalesyncalarm/badge.svg?targetFile=package.json)](https://snyk.io//test/github/jonathandann/yalesyncalarm/badge.svg?targetFile=package.json)
[![npm](https://img.shields.io/npm/l/yalesyncalarm.svg 'license')](https://github.com/jonathandann/yalesyncalarm/blob/master/LICENSE)

API wrapper for the the undocumented API used by the [Yale Sync Smart Home Alarm](https://www.yale.co.uk/en/yale/couk/products/smart-living/smart-home-alarms/sync-smart-alarm/) and [Yale Smart Home Alarm](https://www.yale.co.uk/en/yale/couk/products/smart-living/smart-home-alarms/smart-home-alarm-starter-kit/).

# Installation

`npm install --save yalesyncalarm`

# Usage

## Typescript

The NPM module ships pre-compiled `js` files, and `d.ts` files so it still can be used from typescript directly.

```typescript
// File.ts

import Yale from 'yalesyncalarm'

let accessToken = await Yale.authenticate('username', 'password')
let panelMode = await Yale.Panel.getMode(accessToken)
let setMode = await Yale.Panel.setMode(accessToken, Yale.Panel.Mode.arm) // also .disarm, .home (part-arm)
let sensors = await Yale.Devices.getSensors(accessToken)
```

`Yale.AccessToken` contains both the token itself and an expiry date, after which the token is no longer valid. Clients are expected to verify the token is valid before calling other methods, or handle errors thrown by API calls that use the access token.

`Yale.Panel.Mode` is an enum consisting of `.arm`, `.disarm` and `.home` cases. The Yale alarms do not discrimiate between _home_ and _night_ modes as some other alarm systems do.

`Yale.Devices.Sensor` is a discriminated union for _Door Contact Sensors_ and _Passive IR Sensors_. The states of these are conveniently expressed as `enums`. Each sensor has an `identifier` which can be used to track the state of a sensor across multiple calls to `Yale.Devices.getSensors()`.

## Javascript

The installed NPM module ships pre-compiled `js` files. Therefore you are not required to build the `js` from the original typescript source in order to use the package.

```javascript
// File.js

var Yale = require('yalesyncalarm')

var accessToken = await Yale.authenticate('username', 'password')
var panelMode = await Yale.Panel.getMode(accessToken)
var setMode = await Yale.Panel.setMode(accessToken, Yale.Panel.Model.arm) // also .disarm, .home (part-arm)
var sensors = await Yale.Devices.getSensors(accessToken)
```

# Limitations

The undocumented Yale API can change on a whim, so this may break at any time. If it does, please submit a pull request if you can work out what right changes should be to make it work again.

My best guess is that the `Yale Home` app itself uses a non-HTTP-based protocol like XMPP/MQTT to both send and recieve state changes. The HTTP API used in this project works for pulling state for Yale Sync and Yale Smart Home APIs, but there's no way (yet) to subscribe to state changes.

# Building from Source

```bash
git clone https://github.com/jonathandann/yalesyncalarm.git && cd yalesyncalarm && npm install
```

After running `npm install`, `npm` should automatically run `npm run build`, which runs `node_modules/typescript/bin/tsc` to compile the typescript files. If it doesn't then you can run either `node_modules/typescript/bin/tsc` or `npm run build`.

There are useful configs already included for [prettier](https://prettier.io) and [Visual Studio Code](https://code.visualstudio.com).

Visual Studio Code is configured to use the version of typescript installed as a development dependency in the typescript package.
