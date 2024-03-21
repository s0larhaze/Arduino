export default {
  export: (params) => {
    exportObject2CSV(params.headers, params.exportable, params.fileName, params.columnSeparator)
  }
}

function exportObject2CSV(headers, exportable, fileName, columnSeparator) {
  if (headers) {
    if (typeof headers[0] !== 'object') {
      exportable.unshift(headers)
    } else {
      const headerDataset = {}
      for (let i = 0; i < headers.length; i++) {
        headerDataset[headers[i].name] = headers[i].alias
      }
      exportable.unshift(headerDataset)
    }
  }

  const csv = convert2csv(exportable, columnSeparator)
  const exportFileName = fileName + '.csv'
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], {
    type: 'text/csv;charset=utf-8;'
  })
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, exportFileName)
  } else {
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', exportFileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}

function convert2csv(objArray, columnSeparator) {
    let csv = ''
    for (let i = 0; i < objArray.length; i++) {
        let line = ''
        for (const key in objArray[i]) {
            if (Object.prototype.hasOwnProperty.call(objArray[i], key)) {
                let fieldValue = objArray[i][key];
                if (key == "date") {
                    const date = new Date(fieldValue)
                    fieldValue = date.toLocaleString() // Или можно использовать любой другой метод форматирования даты
                } else {
                    fieldValue = fieldValue.toString().replace(/"/g, '""') // экранирование кавычек
                    if (fieldValue.search(/("|,|\n)/g) >= 0) {
                      fieldValue = '"' + fieldValue + '"'
                    }
                }
                line += fieldValue + columnSeparator
            }
        }
        line = line.slice(0, -1) // удалить последний разделитель
        csv += line + '\n'
    }
    return csv
}
