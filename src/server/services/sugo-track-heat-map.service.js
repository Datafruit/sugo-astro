import { BaseService } from './base.service'

export default class SugoTrackHeatMap extends BaseService {

  /** @type {SugoTrackHeatMap} */
  static instance = null

  constructor() {
    super('TrackHeatMap')
  }

    /**
   * @return {SugoTrackHeatMap}
   */
  static getInstance() {
    if (SugoTrackHeatMap.instance === null) {
      SugoTrackHeatMap.instance = new SugoTrackHeatMap()
    }
    return SugoTrackHeatMap.instance
  }
}