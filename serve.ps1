# Petit serveur statique local (aucune installation requise)
# Usage :  powershell -ExecutionPolicy Bypass -File serve.ps1   puis ouvrir http://localhost:8080
param([int]$Port = 8080)

$root = [IO.Path]::GetFullPath($PSScriptRoot)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Portfolio servi sur http://localhost:$Port/  (Ctrl+C pour arreter)"

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.gif' = 'image/gif'
  '.svg' = 'image/svg+xml'; '.webp' = 'image/webp'; '.pdf' = 'application/pdf'; '.ico' = 'image/x-icon'
  '.mp4' = 'video/mp4'; '.webm' = 'video/webm'; '.woff2' = 'font/woff2'
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($path -eq '' -or $path.EndsWith('/')) { $path = $path + 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root $path))
      if ($file.StartsWith($root) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
        $ext = [IO.Path]::GetExtension($file).ToLower()
        if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
        $res.Headers.Add('Cache-Control', 'no-store')
        $res.Headers.Add('Accept-Ranges', 'bytes')
        $fs = [IO.File]::OpenRead($file)
        try {
          $total = $fs.Length
          $start = 0; $end = $total - 1
          $range = $ctx.Request.Headers['Range']
          if ($range -and $range -match '^bytes=(\d*)-(\d*)$') {
            if ($matches[1] -ne '') { $start = [int64]$matches[1] }
            if ($matches[2] -ne '') { $end = [Math]::Min([int64]$matches[2], $total - 1) }
            if ($matches[1] -eq '' -and $matches[2] -ne '') { $start = $total - [int64]$matches[2]; $end = $total - 1 }
            $res.StatusCode = 206
            $res.Headers.Add('Content-Range', "bytes $start-$end/$total")
          }
          $len = $end - $start + 1
          $res.ContentLength64 = $len
          if ($ctx.Request.HttpMethod -ne 'HEAD') {
            $fs.Seek($start, 'Begin') | Out-Null
            $buf = New-Object byte[] 65536
            $left = $len
            while ($left -gt 0) {
              $n = $fs.Read($buf, 0, [int][Math]::Min($buf.Length, $left))
              if ($n -le 0) { break }
              $res.OutputStream.Write($buf, 0, $n)
              $left -= $n
            }
          }
        } finally { $fs.Close() }
      } else {
        $res.StatusCode = 404
      }
    } catch {
      $res.StatusCode = 500
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
}
