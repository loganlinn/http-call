// @flow

import uri from 'url'

type ProxyOptions = {
  proxy: Object,
  ca?: Array<Buffer>
}

export default class ProxyUtil {
  static get httpProxy () { return process.env.HTTP_PROXY || process.env.http_proxy }
  static get httpsProxy () { return process.env.HTTPS_PROXY || process.env.https_proxy }

  static get usingProxy () : boolean {
    if (this.httpProxy || this.httpsProxy) return true
    return false
  }

  static findTunnel (urlParsed: Object) : Function {
    let tunnel = require('tunnel-agent')
    return urlParsed.protocol === 'https:' ? tunnel.httpsOverHttp : tunnel.httpOverHttp
  }

  static findProxy (urlParsed: Object) : ?string {
    if (urlParsed.protocol === 'https:') {
      return this.httpsProxy || this.httpProxy
    } else {
      return this.httpProxy
    }
  }

  static get sslCertDir () : Array<string> {
    const certDir = process.env.SSL_CERT_DIR
    if (certDir) {
      const fs = require('fs')
      const path = require('path')
      return fs.readdirSync(certDir).map(f => path.join(certDir, f))
    } else {
      return []
    }
  }

  static get sslCertFile () : Array<string> {
    return process.env.SSL_CERT_FILE ? [process.env.SSL_CERT_FILE] : []
  }

  static get certs () : Array<Buffer> {
    let filenames = this.sslCertFile.concat(this.sslCertDir)
    return filenames.map(function (filename: string) : Buffer {
      const fs = require('fs')
      return fs.readFileSync(filename)
    })
  }

  static agent (urlParsed: Object) : any {
    const u = this.findProxy(urlParsed)
    if (u) {
      let proxyParsed = uri.parse(u)
      let tunnelMethod = this.findTunnel(urlParsed)
      let opts: ProxyOptions = {
        proxy: {
          host: proxyParsed.hostname,
          port: proxyParsed.port || '8080'
        }
      }

      if (proxyParsed.auth) {
        opts.proxy.proxyAuth = proxyParsed.auth
      }

      if (this.certs.length > 0) {
        opts.ca = this.certs
      }

      let tunnelAgent = tunnelMethod(opts)
      if (urlParsed.protocol === 'https:') {
        tunnelAgent.defaultPort = 443
      }
      return tunnelAgent
    }
  }
}
