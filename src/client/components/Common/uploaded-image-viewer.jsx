import React from 'react'
import UploadedFileFetcher from '../Fetcher/uploaded-files-fetcher'
import {UploadedFileType} from '../../../common/constants'

export default function UploadedImageViewer({uploadedImageId, useOpenAPI, ...rest}) {
  return (
    <UploadedFileFetcher
      fileId={uploadedImageId}
      type={UploadedFileType.Image}
      useOpenAPI={useOpenAPI}
    >
      {({isFetching, data: [singleFile]}) => {
        if (isFetching || !singleFile) {
          return null
        }
        return (
          <img
            src={singleFile.path}
            alt={singleFile.name}
            {...rest}
          />
        )
      }}
    </UploadedFileFetcher>
  )
}
