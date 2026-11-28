Add-Type -AssemblyName System.Drawing

function New-RadialBrush($cx, $cy, $radius, $inner, $outer) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(($cx - $radius), ($cy - $radius), ($radius * 2), ($radius * 2))
    $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
    $brush.CenterPoint = New-Object System.Drawing.PointF($cx, $cy)
    $brush.CenterColor = $inner
    $brush.SurroundColors = @($outer)
    $path.Dispose()
    return $brush
}

function New-StarPath($cx, $cy, $radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $t = $radius * 0.18
    $path.AddBezier(
        [float]$cx, [float]($cy - $radius),
        [float]($cx + $t), [float]($cy - $t),
        [float]($cx + $t), [float]($cy - $t),
        [float]($cx + $radius), [float]$cy)
    $path.AddBezier(
        [float]($cx + $radius), [float]$cy,
        [float]($cx + $t), [float]($cy + $t),
        [float]($cx + $t), [float]($cy + $t),
        [float]$cx, [float]($cy + $radius))
    $path.AddBezier(
        [float]$cx, [float]($cy + $radius),
        [float]($cx - $t), [float]($cy + $t),
        [float]($cx - $t), [float]($cy + $t),
        [float]($cx - $radius), [float]$cy)
    $path.AddBezier(
        [float]($cx - $radius), [float]$cy,
        [float]($cx - $t), [float]($cy - $t),
        [float]($cx - $t), [float]($cy - $t),
        [float]$cx, [float]($cy - $radius))
    $path.CloseFigure()
    return $path
}

function Draw-Mark($g, $size, $withBackground) {
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $cx = $size * 0.5
    $cy = $size * 0.49

    if ($withBackground) {
        $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 5, 6, 11))
        $g.FillRectangle($bg, 0, 0, $size, $size)
        $bg.Dispose()

        $glow = New-RadialBrush $cx $cy ($size * 0.52) ([System.Drawing.Color]::FromArgb(72, 56, 189, 248)) ([System.Drawing.Color]::FromArgb(0, 5, 6, 11))
        $g.FillEllipse($glow, 0, 0, $size, $size)
        $glow.Dispose()

        $deep = New-RadialBrush $cx ($size * 0.98) ($size * 0.72) ([System.Drawing.Color]::FromArgb(62, 99, 102, 241)) ([System.Drawing.Color]::FromArgb(0, 5, 6, 11))
        $g.FillEllipse($deep, 0, ($size * 0.42), $size, ($size * 1.12))
        $deep.Dispose()
    }

    $r = $size * 0.235

    # Halo do núcleo
    $halo = New-RadialBrush $cx $cy ($r * 2.3) ([System.Drawing.Color]::FromArgb(80, 56, 189, 248)) ([System.Drawing.Color]::FromArgb(0, 56, 189, 248))
    $g.FillEllipse($halo, ($cx - $r * 2.3), ($cy - $r * 2.3), ($r * 4.6), ($r * 4.6))
    $halo.Dispose()

    # Órbitas
    $ring1 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(150, 125, 211, 252)), ([float]($size * 0.006))
    $ring1.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $ring1.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.TranslateTransform($cx, $cy)
    $g.RotateTransform(-28)
    $g.DrawArc($ring1, -($r * 1.78), -($r * 0.58), ($r * 3.56), ($r * 1.16), 16, 318)
    $g.ResetTransform()

    $ring2 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(110, 129, 140, 248)), ([float]($size * 0.0045))
    $ring2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $ring2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.TranslateTransform($cx, $cy)
    $g.RotateTransform(34)
    $g.DrawArc($ring2, -($r * 1.52), -($r * 0.52), ($r * 3.04), ($r * 1.04), 196, 300)
    $g.ResetTransform()

    # Satélites
    $sat1 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 224, 242, 254))
    $g.FillEllipse($sat1, ($cx - $r * 1.48), ($cy + $r * 0.4), ($size * 0.02), ($size * 0.02))
    $sat1.Dispose()
    $sat2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 129, 140, 248))
    $g.FillEllipse($sat2, ($cx + $r * 1.06), ($cy + $r * 0.62), ($size * 0.014), ($size * 0.014))
    $sat2.Dispose()

    # Núcleo
    $core = New-RadialBrush $cx $cy $r ([System.Drawing.Color]::FromArgb(255, 248, 253, 255)) ([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
    $g.FillEllipse($core, ($cx - $r), ($cy - $r), ($r * 2), ($r * 2))
    $core.Dispose()

    $inner = New-RadialBrush ($cx - $r * 0.22) ($cy - $r * 0.26) ($r * 0.62) ([System.Drawing.Color]::FromArgb(235, 255, 255, 255)) ([System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    $g.FillEllipse($inner, ($cx - $r * 0.84), ($cy - $r * 0.88), ($r * 1.24), ($r * 1.24))
    $inner.Dispose()

    $rim = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(170, 224, 242, 254)), ([float]($size * 0.004))
    $g.DrawEllipse($rim, ($cx - $r), ($cy - $r), ($r * 2), ($r * 2))
    $rim.Dispose()

    # Faísca (mesma linguagem da animação de raciocínio)
    $star = New-StarPath ($cx + $r * 1.12) ($cy - $r * 1.05) ($r * 0.36)
    $starBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 186, 230, 253))
    $g.FillPath($starBrush, $star)
    $star.Dispose()
    $starBrush.Dispose()

    $star2 = New-StarPath ($cx - $r * 1.18) ($cy + $r * 0.28) ($r * 0.14)
    $starBrush2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 165, 180, 252))
    $g.FillPath($starBrush2, $star2)
    $star2.Dispose()
    $starBrush2.Dispose()

    $ring1.Dispose()
    $ring2.Dispose()
}

function New-Canvas($width, $height) {
    return New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
}

function Save-Png($bitmap, $path) {
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Output "Saved $path"
}

$dir = Join-Path $PSScriptRoot "assets"

$sizes = @(
    @{ name = "icon.png"; size = 1024; background = $true },
    @{ name = "adaptive-icon.png"; size = 1024; background = $true },
    @{ name = "favicon.png"; size = 48; background = $true }
)

foreach ($item in $sizes) {
    $bmp = New-Canvas $item.size $item.size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    Draw-Mark $g $item.size $item.background
    $g.Dispose()
    Save-Png $bmp (Join-Path $dir $item.name)
}

# splash 1284x2778: marca centralizada no fundo profundo
$sw = 1284; $sh = 2778
$bmp = New-Canvas $sw $sh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 5, 6, 11))
$g.FillRectangle($bg, 0, 0, $sw, $sh)
$bg.Dispose()

$logoSize = 760
$logoBmp = New-Canvas $logoSize $logoSize
$lg = [System.Drawing.Graphics]::FromImage($logoBmp)
Draw-Mark $lg $logoSize $true
$lg.Dispose()
$lx = [int](($sw - $logoSize) / 2)
$ly = [int](($sh - $logoSize) / 2)
$g.DrawImage($logoBmp, $lx, $ly, $logoSize, $logoSize)
$logoBmp.Dispose()

$font = New-Object System.Drawing.Font("Segoe UI", 34, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 148, 163, 184))
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("OPENCODE REMOTE", $font, $brush, (New-Object System.Drawing.RectangleF(0, ($ly + $logoSize + 40), $sw, 90)), $format)
$font.Dispose(); $brush.Dispose(); $format.Dispose()
$g.Dispose()
Save-Png $bmp (Join-Path $dir "splash.png")

Write-Output "Done."
