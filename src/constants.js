export const restVerbs = {
        getting: false,
        posting: false,
        putting: false,
        deleting: false
      },
      versioningProps = {
        version: 0,
        requestVersion: null,
        requestStatus: null,
        requestBody: null,
      },
      recordProps = {
        record: {},
        errors: {}
      },
      singleRecordProps = {
        ...restVerbs,
        ...versioningProps,
        ...recordProps
      },
      actionMatch = /^@FLUTE_(SET|GET|POST|PUT|DELETE|REQUEST_INFO|SAVE)(_TMP)?(_SUCCESS)?_(.*)$/