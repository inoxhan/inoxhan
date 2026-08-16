param(
  [Parameter(Mandatory = $true)][string]$InputPath
)

$ErrorActionPreference = "Stop"
$excel = $null
$workbook = $null
$worksheet = $null
$table = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($InputPath)
  $worksheet = $workbook.Worksheets.Item(1)
  $worksheet.Activate()

  if ($worksheet.Range("A1").Comment -ne $null) {
    $worksheet.Range("A1").Comment.Delete()
  }

  $xlUp = -4162
  $lastRow = $worksheet.Cells($worksheet.Rows.Count, 1).End($xlUp).Row
  if ($lastRow -lt 2) {
    throw "Çalışma sayfasında biçimlendirilecek ürün satırı bulunamadı."
  }

  $usedRange = $worksheet.Range("A1:B$lastRow")
  $usedRange.Font.Name = "Aptos"
  $usedRange.Font.Size = 10
  $usedRange.VerticalAlignment = -4108
  $worksheet.Rows.Item(1).RowHeight = 26
  $worksheet.Range("A2:B$lastRow").RowHeight = 20
  $worksheet.Columns.Item("A").ColumnWidth = 18
  $worksheet.Columns.Item("B").ColumnWidth = 68
  $worksheet.Columns.Item("A").HorizontalAlignment = -4108
  $worksheet.Columns.Item("B").HorizontalAlignment = -4131

  if ($worksheet.ListObjects.Count -eq 0) {
    $table = $worksheet.ListObjects.Add(1, $usedRange, $null, 1)
    $table.Name = "UrunlerTablosu"
  }
  else {
    $table = $worksheet.ListObjects.Item(1)
    $table.Resize($usedRange)
  }
  $table.TableStyle = "TableStyleMedium2"
  $table.ShowTableStyleRowStripes = $true
  $table.ShowAutoFilterDropDown = $true

  # Ürün ve kalite bloklarının başlangıçlarını ince bir ayırıcıyla belirginleştir.
  $values = $usedRange.Value2
  for ($row = 3; $row -le $lastRow; $row++) {
    $previousNorm = [string]$values[($row - 1), 1]
    $currentNorm = [string]$values[$row, 1]
    $previousDescription = [string]$values[($row - 1), 2]
    $currentDescription = [string]$values[$row, 2]
    $previousBase = ($previousDescription -replace ' A[24]$', '') -replace ' [^ ]+$', ''
    $currentBase = ($currentDescription -replace ' A[24]$', '') -replace ' [^ ]+$', ''
    $isProductStart = ($currentNorm -ne $previousNorm) -or ($currentBase -ne $previousBase)
    $isA4Start = $previousDescription.EndsWith(" A2") -and $currentDescription.EndsWith(" A4")

    if ($isProductStart -or $isA4Start) {
      $separator = $worksheet.Range("A$row:B$row")
      $separator.Borders.Item(8).LineStyle = 1
      $separator.Borders.Item(8).Weight = $(if ($isProductStart) { 3 } else { 2 })
      $separator.Borders.Item(8).Color = 8307379
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($separator)
    }
  }

  $excel.ActiveWindow.SplitColumn = 0
  $excel.ActiveWindow.SplitRow = 1
  $excel.ActiveWindow.FreezePanes = $true
  $excel.ActiveWindow.DisplayGridlines = $false
  $excel.ActiveWindow.Zoom = 95

  $worksheet.PageSetup.Orientation = 2
  $worksheet.PageSetup.Zoom = $false
  $worksheet.PageSetup.FitToPagesWide = 1
  $worksheet.PageSetup.FitToPagesTall = $false
  $worksheet.PageSetup.PrintTitleRows = '$1:$1'
  $worksheet.PageSetup.PrintArea = "A1:B$lastRow"

  $workbook.Save()
  Write-Output "Biçimlendirme tamamlandı: $InputPath ($($lastRow - 1) ürün satırı)"
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
