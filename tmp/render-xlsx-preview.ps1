param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [string]$RangeAddress = "A1:B20"
)

$ErrorActionPreference = "Stop"

$excel = $null
$workbook = $null
$worksheet = $null
$chartObject = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($InputPath, 0, $true)
  $worksheet = $workbook.Worksheets.Item(1)
  $worksheet.Activate()
  $excel.ActiveWindow.Zoom = 100

  $range = $worksheet.Range($RangeAddress)
  $range.Select()
  $range.CopyPicture(1, 2)
  Start-Sleep -Milliseconds 750
  $chartObject = $worksheet.ChartObjects().Add(0, 0, $range.Width, $range.Height)
  $chartObject.Activate()
  $chartObject.Chart.Paste()
  Start-Sleep -Milliseconds 750
  if ($chartObject.Chart.Shapes.Count -lt 1) {
    throw "Excel aralık görselini önizleme alanına yapıştıramadı."
  }
  $exported = $chartObject.Chart.Export($OutputPath, "PNG")
  if (-not $exported) {
    throw "Excel önizleme görselini dışa aktaramadı."
  }

  Write-Output $OutputPath
}
finally {
  if ($chartObject -ne $null) {
    $chartObject.Delete()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($chartObject)
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
