// An error we throw on purpose, with the HTTP status the client should receive.
export default class HttpError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}
