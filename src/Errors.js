/**
 * Class for catching internal errors
 */
class ParserError extends Error {
    /**
     * @param {Object|null} error - Caused error
     * @param {string|null} message - Custom message
     * @returns {ParserError}
     */
    constructor(error, message = null) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);

        if (error) {
            const errorProperties = {...error};
            this.message = error.message;
            for (let prop in errorProperties) {
                this[prop] = errorProperties[prop];
            }
        }

        return this;
    }

    /**
     * Gets unique message based on error code
     * @returns {string}
     */
    getMessage() {
        let message = this.name + ': ';

        switch (this.code) {
            case 'EAI_AGAIN':
            case 'EHOSTUNREACH':
                message += `${this.hostname} is not available, check your internet connection`;
                break;

            case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
                message += `${this.message}, check the domain name of the website`;
                break;

            default: message += `Unknown error\n${this.stack}`;
        }

        return message;
    }
}
exports.ParserError = ParserError;

/**
 * Class for catching input data errors from using side
 */
class InputDataError extends ParserError {
    constructor(message) {
        super(null, message);
    }
}
exports.InputDataError  = InputDataError;