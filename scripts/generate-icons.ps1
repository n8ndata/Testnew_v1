# ==========================================================================
# ROUTER Error Tracking - PWA icon generator (Windows PowerShell)
# --------------------------------------------------------------------------
# Generates the PNG icons referenced by manifest.json.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
# ==========================================================================
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

function New-RoundedRectPath {
  param(
    [float]$X, [float]$Y, [float]$W, [float]$H, [float]$R
  )
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $R * 2
  $path.AddArc($X, $Y, $d, $d, 180, 90)
  $path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
  $path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
  $path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-AppIcon {
  param(
    [int]$Size,
    [string]$Path,
    [switch]$Maskable,
    [switch]$FullBleed
  )

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.ColorTranslator]::FromHtml('#1d4ed8'),
    [System.Drawing.ColorTranslator]::FromHtml('#0ea5e9'),
    45.0
  )

  if ($Maskable -or $FullBleed) {
    # Full-bleed background: the OS applies its own mask.
    $g.FillRectangle($gradient, $rect)
  } else {
    $radius = [float]($Size * 0.22)
    $rounded = New-RoundedRectPath 0 0 $Size $Size $radius
    $g.FillPath($gradient, $rounded)
    $rounded.Dispose()
  }
  $gradient.Dispose()

  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $hole = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#1467d8'))
  $scale = $Size / 512.0

  $g.TranslateTransform($Size / 2.0, $Size / 2.0)
  $g.ScaleTransform($scale, $scale)

  # Gear teeth
  for ($i = 0; $i -lt 8; $i++) {
    $state = $g.Save()
    $g.RotateTransform($i * 45.0)
    $tooth = New-RoundedRectPath -25 -180 50 66 10
    $g.FillPath($white, $tooth)
    $tooth.Dispose()
    $g.Restore($state)
  }

  # Gear body + centre hole
  $g.FillEllipse($white, -132, -132, 264, 264)
  $g.FillEllipse($hole, -58, -58, 116, 116)

  $g.ResetTransform()
  $white.Dispose()
  $hole.Dispose()

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

$targets = @(
  @{ Size = 32;  File = 'favicon-32.png';        Maskable = $false; FullBleed = $false },
  @{ Size = 180; File = 'apple-touch-icon.png';  Maskable = $false; FullBleed = $true  },
  @{ Size = 192; File = 'icon-192.png';          Maskable = $false; FullBleed = $false },
  @{ Size = 512; File = 'icon-512.png';          Maskable = $false; FullBleed = $false },
  @{ Size = 512; File = 'icon-maskable-512.png'; Maskable = $true;  FullBleed = $false }
)

foreach ($target in $targets) {
  $output = Join-Path $iconDir $target.File
  New-AppIcon -Size $target.Size -Path $output -Maskable:$target.Maskable -FullBleed:$target.FullBleed
  Write-Host ("Generated {0} ({1}x{1})" -f $target.File, $target.Size)
}
