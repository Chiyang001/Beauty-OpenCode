$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path $PSScriptRoot -Parent
$source = [System.Drawing.Image]::FromFile((Join-Path $taskRoot 'logo.png'))
try {
    # Render at 4x resolution so the transparent rounded edge is antialiased.
    $size = 1024
    $radius = 208
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $shape = [System.Drawing.Drawing2D.GraphicsPath]::new()
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $diameter = $radius * 2
        $shape.AddArc(0, 0, $diameter, $diameter, 180, 90)
        $shape.AddArc(($size-$diameter), 0, $diameter, $diameter, 270, 90)
        $shape.AddArc(($size-$diameter), ($size-$diameter), $diameter, $diameter, 0, 90)
        $shape.AddArc(0, ($size-$diameter), $diameter, $diameter, 90, 90)
        $shape.CloseFigure()
        $graphics.SetClip($shape)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($source, 0, 0, $size, $size)
        $icon = [System.Drawing.Bitmap]::new(256, 256)
        $scaled = [System.Drawing.Graphics]::FromImage($icon)
        try {
            $scaled.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $scaled.DrawImage($bitmap, 0, 0, 256, 256)
            $icon.Save((Join-Path $taskRoot 'assets/icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $scaled.Dispose(); $icon.Dispose() }
    } finally { $shape.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
} finally { $source.Dispose() }
# ICO supports PNG frames, preserving alpha for the taskbar and executable.
$png = [System.IO.File]::ReadAllBytes((Join-Path $taskRoot 'assets/icon.png'))
$stream = [System.IO.File]::Create((Join-Path $taskRoot 'assets/icon.ico'))
$writer = [System.IO.BinaryWriter]::new($stream)
try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
    $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$png.Length); $writer.Write([uint32]22); $writer.Write($png)
} finally { $writer.Dispose() }
