Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath($x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

function Draw-Logo($g, $size) {
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $c1 = [System.Drawing.Color]::FromArgb(255, 10, 10, 15)
    $c2 = [System.Drawing.Color]::FromArgb(255, 26, 26, 46)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45)
    $g.FillRectangle($brush, $rect)
    $brush.Dispose()

    # Terminal window
    $pad = [int]($size * 0.20)
    $wx = $pad
    $wy = [int]($size * 0.26)
    $ww = $size - ($pad * 2)
    $wh = [int]($size * 0.48)
    $path = New-RoundedRectPath $wx $wy $ww $wh ([int]($size * 0.03))
    $winBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 13, 13, 20))
    $g.FillPath($winBrush, $path)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 77, 166, 255)), ([float]($size * 0.006))
    $g.DrawPath($pen, $path)
    $winBrush.Dispose(); $pen.Dispose(); $path.Dispose()

    # Title bar
    $tbH = [int]($size * 0.09)
    $tbPath = New-RoundedRectPath $wx $wy $ww $tbH ([int]($size * 0.03))
    $tbBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 26, 26, 46))
    $g.FillPath($tbBrush, $tbPath)
    $tbBrush.Dispose(); $tbPath.Dispose()

    # Traffic lights
    $dotR = [int]($size * 0.018)
    $dotY = $wy + [int]($tbH / 2) - $dotR
    $dotX = $wx + [int]($size * 0.05)
    $dotColors = @(
        [System.Drawing.Color]::FromArgb(255, 255, 95, 87),
        [System.Drawing.Color]::FromArgb(255, 255, 189, 46),
        [System.Drawing.Color]::FromArgb(255, 40, 202, 66)
    )
    foreach ($dc in $dotColors) {
        $db = New-Object System.Drawing.SolidBrush $dc
        $g.FillEllipse($db, $dotX, $dotY, ($dotR * 2), ($dotR * 2))
        $db.Dispose()
        $dotX += [int]($size * 0.06)
    }

    # Text lines
    $fontSize = [float]($size * 0.085)
    $font = New-Object System.Drawing.Font("Consolas", $fontSize, [System.Drawing.FontStyle]::Bold)
    $fontReg = New-Object System.Drawing.Font("Consolas", $fontSize, [System.Drawing.FontStyle]::Regular)
    $blue = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 77, 166, 255))
    $green = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 34, 197, 94))
    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 224, 224, 224))

    $tx = $wx + [int]($size * 0.05)
    $line1Y = $wy + $tbH + [int]($size * 0.02)
    $lineH = [int]($size * 0.10)
    $g.DrawString("$", $font, $blue, [float]$tx, [float]$line1Y)
    $g.DrawString(" opencode", $fontReg, $white, [float]($tx + $size * 0.06), [float]$line1Y)

    $line2Y = $line1Y + $lineH
    $g.DrawString([char]0x2713, $font, $green, [float]$tx, [float]$line2Y)
    $g.DrawString(" Conectado", $fontReg, $white, [float]($tx + $size * 0.06), [float]$line2Y)

    $line3Y = $line2Y + $lineH
    $g.DrawString("$", $font, $blue, [float]$tx, [float]$line3Y)
    $g.DrawString(" pair", $fontReg, $white, [float]($tx + $size * 0.06), [float]$line3Y)

    $font.Dispose(); $fontReg.Dispose()
    $blue.Dispose(); $green.Dispose(); $white.Dispose()
}

function Save-Png($bitmap, $path) {
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Output "Saved $path"
}

$dir = Join-Path $PSScriptRoot "assets"

# icon.png 1024
$bmp = New-Object System.Drawing.Bitmap 1024, 1024
$g = [System.Drawing.Graphics]::FromImage($bmp)
Draw-Logo $g 1024
$g.Dispose()
Save-Png $bmp (Join-Path $dir "icon.png")

# adaptive-icon.png 1024 (safe zone padding)
$bmp = New-Object System.Drawing.Bitmap 1024, 1024
$g = [System.Drawing.Graphics]::FromImage($bmp)
Draw-Logo $g 1024
$g.Dispose()
Save-Png $bmp (Join-Path $dir "adaptive-icon.png")

# favicon 48
$bmp = New-Object System.Drawing.Bitmap 48, 48
$g = [System.Drawing.Graphics]::FromImage($bmp)
Draw-Logo $g 48
$g.Dispose()
Save-Png $bmp (Join-Path $dir "favicon.png")

# splash.png 1284x2778 portrait with centered logo
$sw = 1284; $sh = 2778
$bmp = New-Object System.Drawing.Bitmap $sw, $sh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 10, 10, 15))
$g.FillRectangle($bg, 0, 0, $sw, $sh)
$bg.Dispose()
# Draw logo centered
$logoSize = 700
$logoBmp = New-Object System.Drawing.Bitmap $logoSize, $logoSize
$lg = [System.Drawing.Graphics]::FromImage($logoBmp)
Draw-Logo $lg $logoSize
$lg.Dispose()
$lx = [int](($sw - $logoSize) / 2)
$ly = [int](($sh - $logoSize) / 2)
$g.DrawImage($logoBmp, $lx, $ly, $logoSize, $logoSize)
$logoBmp.Dispose()
$g.Dispose()
Save-Png $bmp (Join-Path $dir "splash.png")

Write-Output "Done."
