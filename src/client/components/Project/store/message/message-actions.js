/**
 * Created on 06/02/2017.
 */

import { UIActionTypes } from '../constants'
import { MessageTypes } from '../project/constants'

const Actions = {
  clean(){
    return { type: UIActionTypes.CleanMessage }
  },
  sendMessage(message, type){
    return {
      type: UIActionTypes.Message,
      model: { type: type || MessageTypes.Notification, content: message } }
  }
}

export { Actions }
