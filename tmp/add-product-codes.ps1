param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$DataPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"
$excel = $null
$workbook = $null
$worksheet = $null
$table = $null

try {
  $payload = Get-Content -Raw -Encoding UTF8 $DataPath | ConvertFrom-Json
  $rowCount = @($payload.rows).Count
  if ($rowCount -ne 6752) {
    throw "Beklenen 6752 kod satırı yerine $rowCount satır geldi."
  }

  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($InputPath)
  $openedReadOnly = $workbook.ReadOnly
  $worksheet = $workbook.Worksheets.Item(1)
  $worksheet.Activate()

  $lastRow = $worksheet.Cells($worksheet.Rows.Count, 1).End(-4162).Row
  if ($lastRow -ne ($rowCount + 1)) {
    throw "Excel satır sayısı kod verisiyle uyuşmuyor: Excel=$lastRow, beklenen=$($rowCount + 1)."
  }
  if (
    [string]$worksheet.Range("A1").Value2 -ne [string]$payload.existingHeaders[0] -or
    [string]$worksheet.Range("B1").Value2 -ne [string]$payload.existingHeaders[1]
  ) {
    throw "Excel'in mevcut iki sütunlu başlık düzeni beklenenden farklı."
  }
  if ($worksheet.ListObjects.Count -ne 1) {
    throw "Excel'de tam olarak bir ürün tablosu bekleniyordu."
  }
  $table = $worksheet.ListObjects.Item(1)

  # Mevcut tabloyu sağa kaydırarak iki yeni sütunu en başa ekle.
  $worksheet.Range("A:B").EntireColumn.Insert(-4161)
  $worksheet.Range("A1").Value2 = [string]$payload.headers[0]
  $worksheet.Range("B1").Value2 = [string]$payload.headers[1]
  $worksheet.Range("A2:A$lastRow").NumberFormat = "@"
  $worksheet.Range("B2:B$lastRow").NumberFormat = "@"

  $data = New-Object 'object[,]' $rowCount, 2
  for ($index = 0; $index -lt $rowCount; $index++) {
    $data[$index, 0] = [string]$payload.rows[$index][0]
    $data[$index, 1] = [string]$payload.rows[$index][1]
  }
  $worksheet.Range("A2:B$lastRow").Value2 = $data

  $usedRange = $worksheet.Range("A1:D$lastRow")
  $table.Resize($usedRange)
  $table.TableStyle = "TableStyleMedium2"
  $table.ShowTableStyleRowStripes = $true
  $table.ShowAutoFilterDropDown = $true

  $usedRange.Font.Name = "Aptos"
  $usedRange.Font.Size = 10
  $usedRange.VerticalAlignment = -4108
  $worksheet.Rows.Item(1).RowHeight = 26
  $worksheet.Range("A2:D$lastRow").RowHeight = 20
  $worksheet.Columns.Item("A").ColumnWidth = 22
  $worksheet.Columns.Item("B").ColumnWidth = 14
  $worksheet.Columns.Item("C").ColumnWidth = 18
  $worksheet.Columns.Item("D").ColumnWidth = 68
  $worksheet.Columns.Item("A").HorizontalAlignment = -4108
  $worksheet.Columns.Item("B").HorizontalAlignment = -4108
  $worksheet.Columns.Item("C").HorizontalAlignment = -4108
  $worksheet.Columns.Item("D").HorizontalAlignment = -4131

  # Ürün blokları ile A2/A4 geçişlerini dört sütunun tamamında belirginleştir.
  foreach ($pageRange in $payload.summary.pageRanges) {
    $startRow = [int]$pageRange.startRow
    if ($startRow -gt 2) {
      $separator = $worksheet.Range("A$startRow:D$startRow")
      $separator.Borders.Item(8).LineStyle = 1
      $separator.Borders.Item(8).Weight = 3
      $separator.Borders.Item(8).Color = 8307379
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($separator)
    }
  }

  $descriptions = $worksheet.Range("D2:D$lastRow").Value2
  for ($row = 3; $row -le $lastRow; $row++) {
    $previousDescription = [string]$descriptions[($row - 2), 1]
    $currentDescription = [string]$descriptions[($row - 1), 1]
    if ($previousDescription.EndsWith(" A2") -and $currentDescription.EndsWith(" A4")) {
      $separator = $worksheet.Range("A$row:D$row")
      $separator.Borders.Item(8).LineStyle = 1
      $separator.Borders.Item(8).Weight = 2
      $separator.Borders.Item(8).Color = 8307379
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($separator)
    }
  }

  $excel.ActiveWindow.SplitColumn = 0
  $excel.ActiveWindow.SplitRow = 1
  $excel.ActiveWindow.FreezePanes = $true
  $excel.ActiveWindow.DisplayGridlines = $false
  $excel.ActiveWindow.Zoom = 85

  $worksheet.PageSetup.Orientation = 2
  $worksheet.PageSetup.Zoom = $false
  $worksheet.PageSetup.FitToPagesWide = 1
  $worksheet.PageSetup.FitToPagesTall = $false
  $worksheet.PageSetup.PrintTitleRows = '$1:$1'
  $worksheet.PageSetup.PrintArea = "A1:D$lastRow"

  if (Test-Path -LiteralPath $OutputPath) {
    throw "Hedef dosya zaten var; üzerine yazılmadı: $OutputPath"
  }
  $workbook.SaveAs($OutputPath, 51)
  Write-Output "Ürün Kodu ve Grup Kodu sütunları eklendi: $rowCount satır (kaynak salt-okunur: $openedReadOnly)"
}
finally {
  if ($table -ne $null) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($table)
  }
  if ($workbook -ne $null) {
    $workbook.Close($false)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
  }
  if ($worksheet -ne $null) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($worksheet)
  }
  if ($excel -ne $null) {
    $excel.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
