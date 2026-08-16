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
  $workbook = $excel.Workbooks.Open($InputPath, 0, $true)
  $worksheet = $workbook.Worksheets.Item(1)
  $worksheet.Activate()
  if ($worksheet.ListObjects.Count -gt 0) {
    $table = $worksheet.ListObjects.Item(1)
  }

  $lastRow = $worksheet.Cells($worksheet.Rows.Count, 1).End(-4162).Row
  $result = [ordered]@{
    WorkbookReadOnly = $workbook.ReadOnly
    SheetName = $worksheet.Name
    LastRow = $lastRow
    HeaderA1 = [string]$worksheet.Range("A1").Value2
    HeaderB1 = [string]$worksheet.Range("B1").Value2
    TableCount = $worksheet.ListObjects.Count
    TableRange = $(if ($table -ne $null) { $table.Range.Address($false, $false) } else { $null })
    TableStyle = $(if ($table -ne $null) { $table.TableStyle.Name } else { $null })
    TableFiltersShown = $(if ($table -ne $null) { $table.ShowAutoFilterDropDown } else { $false })
    SheetAutoFilterMode = $worksheet.AutoFilterMode
    FreezePanes = $excel.ActiveWindow.FreezePanes
    SplitRow = $excel.ActiveWindow.SplitRow
    ColumnAWidth = $worksheet.Columns.Item("A").ColumnWidth
    ColumnBWidth = $worksheet.Columns.Item("B").ColumnWidth
    Gridlines = $excel.ActiveWindow.DisplayGridlines
  }
  $result | ConvertTo-Json
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
