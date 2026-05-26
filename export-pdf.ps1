$chromeCandidates = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

$browser = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $browser) {
  throw "Nenhum Chrome/Edge compatível foi encontrado para exportação em PDF."
}

$htmlPath = Join-Path $PSScriptRoot "ebook-carro-eletrico-sem-misterio.html"
$pdfPath = Join-Path $PSScriptRoot "ebook-carro-eletrico-sem-misterio.pdf"

if (-not (Test-Path $htmlPath)) {
  throw "Arquivo HTML não encontrado: $htmlPath"
}

$htmlUri = [System.Uri]::new($htmlPath).AbsoluteUri

$null = & $browser `
  --headless=new `
  --disable-gpu `
  --allow-file-access-from-files `
  --no-pdf-header-footer `
  --print-to-pdf="$pdfPath" `
  --print-to-pdf-no-header `
  "$htmlUri"

Start-Sleep -Seconds 2

if (-not (Test-Path $pdfPath) -or (Get-Item $pdfPath).Length -le 0) {
  throw "Falha ao gerar o PDF."
}

Write-Output "PDF gerado em: $pdfPath"
