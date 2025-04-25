const http = require('http');
const https = require('https');
const fs = require('fs');

class Request {

    /**
     *
     * @returns {Promise<string|null>} html string from response
     * @public
     */
    static async get(website) {
        return await (new this())._request(website);
    }

    static async post(website, body) {
        return await (new this())._request(website, body);
    }

    static isHtml(data) {
        return (data.startsWith('<!doctype html') || data.startsWith('<!DOCTYPE HTML'))
            && data.includes('<html')
            && data.includes('<head')
            && data.includes('</head>')
            && data.includes('<body')
            && data.includes('</body>')
            && data.includes('</html>')
            ;
    }



    /**
     * GET/POST requests for taking webpage as html utf-8 string
     * POST requests not available yet
     *
     * @param {string} website Full URL of website
     * @param {JSON|null} body For post requests
     * @returns {Promise<string|null>} html string from response
     *
     * @private
     */
    async _request(website, body = null) {
        if (!website.match(/^https?:\/\/.*$/)) {
            throw new Error("Website is not html page");
        }

        let protocol = website.slice(0, website.indexOf('//') - 1);
        let hostname = website.slice(website.indexOf('//') + 2);
        let pathIndex = hostname.indexOf('/');

        let path = pathIndex < 0 ? '/' : hostname.slice(pathIndex);
        path = encodeURI(path);

        hostname = hostname.substr(0, pathIndex < 0 ? hostname.length+1 : pathIndex)

        let port = protocol === 'http' ? 80 : 443;
        const protocolModule = protocol === 'http' ? http : https;

        let method = body ? 'POST' : 'GET';

        let options = {
            hostname,
            port,
            path,
            method,
        }

        if (body) {
            // body as a JSON string only
            options.headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': body.length,
            }
        }

        let data = await new Promise(async (res, rej) => {

            try{
                let buff; // body of a webpage in binary
                let req = await protocolModule.request(options, (response) => {
                    response.on('data', data => {

                        if (!buff) {
                            buff = data;
                        }
                        else {
                            buff = Buffer.concat([buff, data]);
                        }
                    })

                    response.on('error', (err) => rej(err));
                    response.once('close', () => res(buff?.toString()));
                });

                req.on('error', (err) => rej(err));
                req.end();
            }
            catch (err) {
                rej(err);
            }

            /*if(body){
                req.write(body);
            }*/
        });

        return data;
    }
}

module.exports = Request;