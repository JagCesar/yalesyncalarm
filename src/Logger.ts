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

export interface ILogger {
	debug(message: string, ...optionalParams: any[]): void
	info(message: string, ...optionalParams: any[]): void
	error(message: string, ...optionalParams: any[]): void
}

export enum LogLevel {
	Debug = 1 << 0,
	Info = 1 << 1,
	Error = 1 << 2,
}

export class Logger implements ILogger {
	public constructor(
		readonly _levels: LogLevel = LogLevel.Info | LogLevel.Error,
		readonly _log: typeof console.log = console.log
	) {}

	public debug(message: string, ...optionalParams: any[]): void {
		if ((this._levels & LogLevel.Debug) == LogLevel.Debug) {
			this.emitLog('debug', message, ...optionalParams)
		}
	}

	public info(message: string, ...optionalParams: any[]): void {
		if ((this._levels & LogLevel.Info) == LogLevel.Info) {
			this.emitLog('info', message, ...optionalParams)
		}
	}

	public error(message: string, ...optionalParams: any[]): void {
		if ((this._levels & LogLevel.Error) == LogLevel.Error) {
			this.emitLog('error', message, ...optionalParams)
		}
	}

	private emitLog(
		type: 'debug' | 'info' | 'error',
		message: string,
		...optionalParams: any[]
	): void {
		this._log(`[${type}] ${message}`, ...optionalParams)
	}
}
