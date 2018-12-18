import * as request from 'superagent'
import { assignTo, DateRange, Calendar } from 'fullcalendar'
import { registerResourceSourceDef, ResourceSourceInput } from '../structs/resource-source'

interface JsonFeedMeta {
  url: string
  method: string
  extraData?: any
}

registerResourceSourceDef({

  parseMeta(raw: ResourceSourceInput): JsonFeedMeta | null {
    if (typeof raw === 'string') {
      raw = { url: raw }
    } else if (!raw || typeof raw !== 'object' || !raw.url) {
      return null
    }

    return {
      url: raw.url,
      method: (raw.method || 'GET').toUpperCase(),
      extraData: raw.extraData
    }
  },

  fetch(arg, successCallback, failureCallback) {
    let meta: JsonFeedMeta = arg.resourceSource.meta
    let theRequest
    let requestParams = buildRequestParams(meta, arg.range, arg.calendar)

    if (meta.method === 'GET') {
      theRequest = request.get(meta.url).query(requestParams) // querystring params
    } else {
      theRequest = request(meta.method, meta.url).send(requestParams) // body data
    }

    theRequest.end((error, res) => {
      let rawResources

      if (!error) {
        if (res.body) { // parsed JSON
          rawResources = res.body
        } else if (res.text) {
          // if the server doesn't set Content-Type, won't be parsed as JSON. parse anyway.
          rawResources = JSON.parse(res.text)
        }

        if (rawResources) {
          successCallback({ rawResources, response: res })
        } else {
          failureCallback({ message: 'Invalid JSON response', response: res })
        }

      } else {
        failureCallback(error) // error has { error, response }
      }
    })
  }

})

// TODO: somehow consolidate with event json feed
function buildRequestParams(meta: JsonFeedMeta, range: DateRange | null, calendar: Calendar) {
  const dateEnv = calendar.dateEnv
  let startParam
  let endParam
  let timeZoneParam
  let customRequestParams
  let params = {}

  if (range) {
    // startParam = meta.startParam
    // if (startParam == null) {
      startParam = calendar.opt('startParam')
    // }

    // endParam = meta.endParam
    // if (endParam == null) {
      endParam = calendar.opt('endParam')
    // }

    // timeZoneParam = meta.timeZoneParam
    // if (timeZoneParam == null) {
      timeZoneParam = calendar.opt('timeZoneParam')
    // }

    params[startParam] = dateEnv.formatIso(range.start)
    params[endParam] = dateEnv.formatIso(range.end)

    if (dateEnv.timeZone !== 'local') {
      params[timeZoneParam] = dateEnv.timeZone
    }
  }

  // retrieve any outbound GET/POST data from the options
  if (typeof meta.extraData === 'function') {
    // supplied as a function that returns a key/value object
    customRequestParams = meta.extraData()
  } else {
    // probably supplied as a straight key/value object
    customRequestParams = meta.extraData || {}
  }

  assignTo(params, customRequestParams)

  return params
}